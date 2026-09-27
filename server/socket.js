import { db } from './db.js';

// Mapowanie: userId -> Set(socketId)
const userSockets = new Map();
// Mapowanie: channelId -> Map(socketId, { user, isMuted, isDeafened, isSpeaking })
const voiceRooms = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null;

    // Rejestracja użytkownika w socketach
    socket.on('register-user', ({ userId }) => {
      if (!userId) return;
      currentUserId = userId;
      socket.userId = userId;

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);

      // Aktualizuj status użytkownika
      const user = db.findUserById(userId);
      if (user && user.status === 'offline') {
        db.updateUser(userId, { status: 'online' });
      }

      // Rozgłoś wszystkim aktualizację obecności
      io.emit('user-status-changed', {
        userId,
        status: user ? user.status : 'online'
      });
    });

    // Zmiana statusu obecności (online, idle, dnd, offline)
    socket.on('set-status', ({ status }) => {
      if (!currentUserId) return;
      db.updateUser(currentUserId, { status });
      io.emit('user-status-changed', {
        userId: currentUserId,
        status
      });
    });

    // --- KANAŁY TEKSTOWE ---
    socket.on('join-text-channel', ({ channelId }) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave-text-channel', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send-message', ({ channelId, serverId, text, attachments }) => {
      const hasText = text && text.trim().length > 0;
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!currentUserId || (!hasText && !hasAttachments)) return;

      const user = db.findUserById(currentUserId);
      if (!user) return;

      // Sprawdź uprawnienia kanału tekstowego (readOnly / isPrivate)
      if (serverId) {
        const server = db.getServerById(serverId);
        if (server) {
          const ch = (server.channels || []).find(c => c.id === channelId);
          if (ch) {
            const isOwner = server.ownerId === currentUserId;
            const canManage = isOwner || db.hasServerPermission(server, currentUserId, 'MANAGE_MESSAGES') || db.hasServerPermission(server, currentUserId, 'MANAGE_CHANNELS');
            const userRoles = db.getMemberRoles(server, currentUserId).map(r => r.id);

            if (ch.readOnly && !canManage) {
              const allowed = ch.allowSendRoleIds && ch.allowSendRoleIds.some(rId => userRoles.includes(rId));
              if (!allowed) {
                socket.emit('error-notice', { message: 'Ten kanał jest tylko do odczytu.' });
                return;
              }
            }

            if (ch.isPrivate && !canManage) {
              const allowed = ch.allowedRoleIds && ch.allowedRoleIds.some(rId => userRoles.includes(rId));
              if (!allowed) {
                socket.emit('error-notice', { message: 'Brak dostępu do tego kanału prywatnego.' });
                return;
              }
            }
          }
        }
      }

      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        channelId,
        serverId,
        userId: currentUserId,
        text: (text || '').trim(),
        attachments: hasAttachments ? attachments : [],
        createdAt: new Date().toISOString()
      };

      db.addMessage(newMsg);

      io.to(`channel:${channelId}`).emit('new-message', {
        message: newMsg,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          avatarEmoji: user.avatarEmoji,
          avatarUrl: user.avatarUrl || user.avatar || user.avatarImage || null,
          status: user.status
        }
      });
    });

    socket.on('typing-start', ({ channelId }) => {
      if (!currentUserId) return;
      const user = db.findUserById(currentUserId);
      socket.to(`channel:${channelId}`).emit('user-typing', {
        channelId,
        user: { id: currentUserId, displayName: user?.displayName || user?.username }
      });
    });

    socket.on('typing-stop', ({ channelId }) => {
      if (!currentUserId) return;
      socket.to(`channel:${channelId}`).emit('user-stop-typing', {
        channelId,
        userId: currentUserId
      });
    });

    // --- WIADOMOŚCI PRYWATNE (PV / DM) ---
    socket.on('send-direct-message', ({ recipientId, text, attachments }) => {
      const hasText = text && text.trim().length > 0;
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!currentUserId || !recipientId || (!hasText && !hasAttachments)) return;

      const user = db.findUserById(currentUserId);
      if (!user) return;

      const newDm = {
        id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: currentUserId,
        recipientId,
        text: (text || '').trim(),
        attachments: hasAttachments ? attachments : [],
        createdAt: new Date().toISOString()
      };

      db.addDirectMessage(newDm);

      // Dodaj relację znajomości jeśli jeszcze nie istnieje
      db.addFriendship(currentUserId, recipientId);

      const dmPayload = {
        message: newDm,
        sender: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          avatarEmoji: user.avatarEmoji,
          avatarUrl: user.avatarUrl || user.avatar || user.avatarImage || null,
          status: user.status
        }
      };

      // Wyślij do odbiorcy
      const recipientSockets = userSockets.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach(sId => {
          io.to(sId).emit('new-direct-message', dmPayload);
        });
      }

      // Wyślij także do nadawcy (do wszystkich jego połączonych kart/urządzeń)
      const senderSockets = userSockets.get(currentUserId);
      if (senderSockets) {
        senderSockets.forEach(sId => {
          io.to(sId).emit('new-direct-message', dmPayload);
        });
      }
    });

    socket.on('delete-message', ({ messageId, channelId, serverId }) => {
      if (!currentUserId || !messageId) return;

      const messages = db.data.messages || [];
      const msg = messages.find(m => m.id === messageId);

      const targetChannelId = channelId || msg?.channelId;
      const targetServerId = serverId || msg?.serverId;

      if (msg) {
        const server = db.getServerById(targetServerId);
        const isAuthor = msg.userId === currentUserId;
        const canManage = server ? db.hasServerPermission(server, currentUserId, 'MANAGE_MESSAGES') : false;

        if (!isAuthor && !canManage) return;

        db.deleteMessage(messageId);
      }

      if (targetChannelId) {
        io.to(`channel:${targetChannelId}`).emit('message-deleted', {
          messageId,
          channelId: targetChannelId
        });
      }
    });

    socket.on('delete-direct-message', ({ messageId, recipientId }) => {
      if (!currentUserId || !messageId) return;

      const dms = db.data.directMessages || [];
      const dm = dms.find(m => m.id === messageId);

      if (dm) {
        if (dm.senderId !== currentUserId) return;
        db.deleteDirectMessage(messageId);
      }

      const targetId = recipientId || (dm ? (dm.senderId === currentUserId ? dm.recipientId : dm.senderId) : null);
      if (targetId) {
        const otherSockets = userSockets.get(targetId);
        if (otherSockets) {
          otherSockets.forEach(sId => io.to(sId).emit('direct-message-deleted', { messageId }));
        }
      }
      socket.emit('direct-message-deleted', { messageId });
    });

    // --- KANAŁY GŁOSOWE (WebRTC Voice Rooms) ---
    socket.on('join-voice-channel', ({ channelId, serverId }) => {
      if (!currentUserId || !channelId) return;
      const user = db.findUserById(currentUserId);
      if (!user) return;

      // Sprawdź uprawnienia do wejścia na kanał głosowy
      if (serverId) {
        const server = db.getServerById(serverId);
        if (server) {
          const ch = (server.channels || []).find(c => c.id === channelId);
          if (ch) {
            const userRoles = db.getMemberRoles(server, currentUserId);
            const userRoleIds = userRoles.map(r => r.id);
            const isOwner = server.ownerId === currentUserId;
            const isAdmin = isOwner || userRoleIds.includes('role-owner') || userRoleIds.includes('role-admin') || db.hasServerPermission(server, currentUserId, 'ADMINISTRATOR');

            if (!isAdmin) {
              if (ch.isPrivate && ch.allowedRoleIds && ch.allowedRoleIds.length > 0) {
                const hasAccess = ch.allowedRoleIds.some(rId => userRoleIds.includes(rId));
                if (!hasAccess) {
                  socket.emit('voice-join-denied', { channelId, message: 'Brak uprawnień do dołączenia do tego kanału głosowego.' });
                  return;
                }
              }
              if (ch.allowConnectRoleIds && ch.allowConnectRoleIds.length > 0) {
                const hasConnect = ch.allowConnectRoleIds.some(rId => userRoleIds.includes(rId));
                if (!hasConnect) {
                  socket.emit('voice-join-denied', { channelId, message: 'Do tego kanału głosowego mogą dołączać tylko wyznaczone role.' });
                  return;
                }
              }
            }
          }
        }
      }

      const safeUser = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarEmoji: user.avatarEmoji,
        avatarUrl: user.avatarUrl || user.avatar || user.avatarImage || null,
        bannerColor: user.bannerColor || '#5865f2',
        status: user.status || 'online',
        customStatus: user.customStatus || '',
        socketId: socket.id
      };

      // Opuść ewentualne poprzednie pokoje głosowe tego socketu
      handleLeaveAllVoiceRooms(socket, io);

      if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Map());
      }
      const room = voiceRooms.get(channelId);

      // Pobierz listę istniejących użytkowników w tym pokoju
      const existingPeers = Array.from(room.values());

      // Dodaj nowego użytkownika
      room.set(socket.id, {
        user: safeUser,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        channelId,
        serverId
      });

      socket.voiceChannelId = channelId;
      socket.join(`voice:${channelId}`);

      // Zwróć dołączającemu listę użytkowników w pokoju
      socket.emit('voice-room-users', {
        channelId,
        users: existingPeers
      });

      // Poinformuj innych o nowym uczestniku
      socket.to(`voice:${channelId}`).emit('user-joined-voice', {
        channelId,
        user: safeUser
      });

      // Powiadomienie globalne dla UI serwera (żeby w drzewie kanałów było widać kto siedzi)
      io.emit('voice-state-update', {
        channelId,
        serverId,
        users: Array.from(room.values()).map(r => r.user)
      });
    });

    socket.on('leave-voice-channel', ({ channelId }) => {
      handleLeaveVoiceRoom(socket, channelId, io);
    });

    // Sygnalizacja WebRTC dla kanałów głosowych
    socket.on('voice-signal', ({ targetSocketId, signal, callerUser }) => {
      io.to(targetSocketId).emit('voice-signal', {
        signal,
        callerSocketId: socket.id,
        callerUser
      });
    });

    socket.on('voice-speaking-state', ({ channelId, isSpeaking }) => {
      if (!channelId) return;
      socket.to(`voice:${channelId}`).emit('user-speaking-changed', {
        socketId: socket.id,
        userId: currentUserId,
        isSpeaking
      });
    });

    socket.on('voice-mute-state', ({ channelId, isMuted, isDeafened }) => {
      if (!channelId) return;
      const room = voiceRooms.get(channelId);
      if (room && room.has(socket.id)) {
        const peer = room.get(socket.id);
        peer.isMuted = isMuted;
        peer.isDeafened = isDeafened;
      }
      io.to(`voice:${channelId}`).emit('user-mute-changed', {
        socketId: socket.id,
        userId: currentUserId,
        isMuted,
        isDeafened
      });
    });

    socket.on('screen-share-started', ({ channelId }) => {
      if (!channelId) return;
      socket.to(`voice:${channelId}`).emit('user-started-screen-share', {
        socketId: socket.id,
        userId: currentUserId
      });
    });

    socket.on('screen-share-stopped', ({ channelId }) => {
      if (!channelId) return;
      socket.to(`voice:${channelId}`).emit('user-stopped-screen-share', {
        socketId: socket.id,
        userId: currentUserId
      });
    });

    // --- PRZENOSZENIE UŻYTKOWNIKÓW MIĘDZY KANAŁAMI GŁOSOWYMI (MOVE MEMBERS) ---
    socket.on('move-voice-user', ({ serverId, targetUserId, targetChannelId }) => {
      if (!currentUserId || !serverId || !targetUserId || !targetChannelId) return;

      const server = db.getServerById(serverId);
      if (!server) return;

      // Sprawdź uprawnienia do przenoszenia (MOVE_MEMBERS lub ADMINISTRATOR lub właściciel)
      if (!db.hasServerPermission(server, currentUserId, 'MOVE_MEMBERS')) {
        socket.emit('error-notify', { message: 'Brak uprawnień do przenoszenia członków.' });
        return;
      }

      const targetChannel = (server.channels || []).find(c => c.id === targetChannelId && c.type === 'voice');
      if (!targetChannel) return;

      const targetSockets = userSockets.get(targetUserId);
      if (targetSockets && targetSockets.size > 0) {
        targetSockets.forEach(sId => {
          io.to(sId).emit('forced-voice-channel-switch', {
            channelId: targetChannel.id,
            channelName: targetChannel.name,
            serverId
          });
        });
      }
    });

    // Powiadomienie o zmianie ról / struktury serwera
    socket.on('notify-server-updated', ({ serverId }) => {
      io.emit('server-data-changed', { serverId });
    });

    // Powiadomienie o aktualizacji profilu (natychmiastowa zmiana awatara w pokojach głosowych i na czacie)
    socket.on('user-profile-updated', ({ userId, displayName, avatarUrl, avatarColor, avatarEmoji, bannerColor, customStatus, status }) => {
      const uId = userId || currentUserId;
      if (!uId) return;

      // Zaktualizuj stan użytkownika we wszystkich aktywnych pokojach głosowych
      voiceRooms.forEach((room, channelId) => {
        let roomChanged = false;
        let serverId = null;
        room.forEach((peer) => {
          if (peer.user.id === uId) {
            serverId = peer.serverId;
            if (displayName) peer.user.displayName = displayName;
            if (avatarUrl !== undefined) peer.user.avatarUrl = avatarUrl;
            if (avatarColor) peer.user.avatarColor = avatarColor;
            if (avatarEmoji) peer.user.avatarEmoji = avatarEmoji;
            if (bannerColor) peer.user.bannerColor = bannerColor;
            if (customStatus !== undefined) peer.user.customStatus = customStatus;
            roomChanged = true;
          }
        });

        if (roomChanged) {
          io.emit('voice-state-update', {
            channelId,
            serverId,
            users: Array.from(room.values()).map(r => r.user)
          });
        }
      });

      // Rozgłoś do wszystkich o zmianie profilu
      io.emit('user-profile-changed', {
        userId: uId,
        displayName,
        avatarUrl,
        avatarColor,
        avatarEmoji,
        bannerColor,
        customStatus,
        status
      });
    });

    // --- BEZPOŚREDNIE ROZMOWY GŁOSOWE PV (1-on-1 Voice Call) ---
    socket.on('start-direct-call', ({ targetUserId }) => {
      if (!currentUserId || !targetUserId) return;
      const caller = db.findUserById(currentUserId);
      if (!caller) return;

      const recipientSockets = userSockets.get(targetUserId);
      if (recipientSockets && recipientSockets.size > 0) {
        recipientSockets.forEach(sId => {
          io.to(sId).emit('incoming-direct-call', {
            caller: {
              id: caller.id,
              username: caller.username,
              displayName: caller.displayName,
              avatarColor: caller.avatarColor,
              avatarEmoji: caller.avatarEmoji,
              avatarUrl: caller.avatarUrl || caller.avatar || caller.avatarImage || null,
              socketId: socket.id
            }
          });
        });
        socket.emit('direct-call-ringing', { targetUserId });
      } else {
        socket.emit('direct-call-failed', { reason: 'Użytkownik jest obecnie offline' });
      }
    });

    socket.on('accept-direct-call', ({ callerSocketId }) => {
      const accepter = db.findUserById(currentUserId);
      io.to(callerSocketId).emit('direct-call-accepted', {
        accepter: {
          id: accepter.id,
          username: accepter.username,
          displayName: accepter.displayName,
          avatarColor: accepter.avatarColor,
          avatarEmoji: accepter.avatarEmoji,
          avatarUrl: accepter.avatarUrl || accepter.avatar || accepter.avatarImage || null,
          socketId: socket.id
        }
      });
    });

    socket.on('reject-direct-call', ({ callerSocketId, reason }) => {
      io.to(callerSocketId).emit('direct-call-rejected', {
        reason: reason || 'Połączenie zostało odrzucone'
      });
    });

    socket.on('end-direct-call', ({ targetSocketId, targetUserId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('direct-call-ended');
      } else if (targetUserId) {
        const sIds = userSockets.get(targetUserId);
        if (sIds) {
          sIds.forEach(id => io.to(id).emit('direct-call-ended'));
        }
      }
    });

    socket.on('direct-call-signal', ({ targetSocketId, signal }) => {
      io.to(targetSocketId).emit('direct-call-signal', {
        fromSocketId: socket.id,
        signal
      });
    });

    // --- ROZŁĄCZENIE ---
    socket.on('disconnect', () => {
      handleLeaveAllVoiceRooms(socket, io);

      if (currentUserId && userSockets.has(currentUserId)) {
        const set = userSockets.get(currentUserId);
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(currentUserId);
          // Jeśli brak aktywnych połączeń, ustaw status offline
          db.updateUser(currentUserId, { status: 'offline' });
          io.emit('user-status-changed', {
            userId: currentUserId,
            status: 'offline'
          });
        }
      }
    });
    // --- POWIADOMIENIA ZNAJOMYCH W CZASIE RZECZYWISTYM (DISCORD-STYLE) ---
    socket.on('friend-request-notify', ({ targetUserId, senderUser }) => {
      const recipientSockets = userSockets.get(targetUserId);
      if (recipientSockets) {
        for (const sockId of recipientSockets) {
          io.to(sockId).emit('friend-request-received', {
            sender: senderUser,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    socket.on('friend-accepted-notify', ({ targetUserId, user }) => {
      const recipientSockets = userSockets.get(targetUserId);
      if (recipientSockets) {
        for (const sockId of recipientSockets) {
          io.to(sockId).emit('friend-accepted', {
            user,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    socket.on('friend-removed-notify', ({ targetUserId, userId }) => {
      const recipientSockets = userSockets.get(targetUserId);
      if (recipientSockets) {
        for (const sockId of recipientSockets) {
          io.to(sockId).emit('friend-removed', { userId });
        }
      }
    });
  });
};

function handleLeaveVoiceRoom(socket, channelId, io) {
  if (!channelId || !voiceRooms.has(channelId)) return;
  const room = voiceRooms.get(channelId);

  if (room.has(socket.id)) {
    const peer = room.get(socket.id);
    const serverId = peer.serverId;
    room.delete(socket.id);
    socket.leave(`voice:${channelId}`);
    socket.voiceChannelId = null;

    // Poinformuj pozostałych w kanale
    io.to(`voice:${channelId}`).emit('user-left-voice', {
      channelId,
      socketId: socket.id,
      userId: socket.userId
    });

    // Zaktualizuj globalną listę w UI serwera
    io.emit('voice-state-update', {
      channelId,
      serverId,
      users: Array.from(room.values()).map(r => r.user)
    });

    if (room.size === 0) {
      voiceRooms.delete(channelId);
    }
  }
}

function handleLeaveAllVoiceRooms(socket, io) {
  if (socket.voiceChannelId) {
    handleLeaveVoiceRoom(socket, socket.voiceChannelId, io);
  }
}
