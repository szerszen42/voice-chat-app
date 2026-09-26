import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Upewnij się, że katalog na dane istnieje
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultInitialData = {
  users: [],
  servers: [],
  messages: [],
  directMessages: [],
  friendships: []
};

class JSONDatabase {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.saveData(defaultInitialData);
        return JSON.parse(JSON.stringify(defaultInitialData));
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Błąd wczytywania bazy danych, inicjalizacja domyślnych danych:', err);
      return JSON.parse(JSON.stringify(defaultInitialData));
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Błąd zapisu bazy danych:', err);
    }
  }

  save() {
    this.saveData(this.data);
  }

  // --- Użytkownicy ---
  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserByUsername(username) {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  createUser(user) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  getAllUsers() {
    return this.data.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  // --- Serwery ---
  getAllServers() {
    return this.data.servers;
  }

  getPublicServers() {
    return this.data.servers.filter(s => s.isPublic);
  }

  getServerById(id) {
    return this.data.servers.find(s => s.id === id);
  }

  getServerByInviteCode(code) {
    return this.data.servers.find(s => s.inviteCode.toUpperCase() === code.trim().toUpperCase());
  }

  createServer(server) {
    this.data.servers.push(server);
    this.save();
    return server;
  }

  updateServer(id, updates) {
    const server = this.getServerById(id);
    if (!server) return null;
    Object.assign(server, updates);
    this.save();
    return server;
  }

  deleteServer(id) {
    const index = this.data.servers.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.servers.splice(index, 1);
      // Usuń powiązane wiadomości
      this.data.messages = this.data.messages.filter(m => m.serverId !== id);
      this.save();
      return true;
    }
    return false;
  }

  addServerMember(serverId, userId) {
    const server = this.getServerById(serverId);
    if (server && !server.members.includes(userId)) {
      server.members.push(userId);
      this.save();
    }
    return server;
  }

  removeServerMember(serverId, userId) {
    const server = this.getServerById(serverId);
    if (server) {
      server.members = server.members.filter(id => id !== userId);
      this.save();
    }
    return server;
  }

  addChannel(serverId, channel) {
    const server = this.getServerById(serverId);
    if (server) {
      server.channels.push(channel);
      this.save();
      return channel;
    }
    return null;
  }

  updateChannel(serverId, channelId, updates) {
    const server = this.getServerById(serverId);
    if (server) {
      const channel = server.channels.find(c => c.id === channelId);
      if (channel) {
        Object.assign(channel, updates);
        this.save();
        return channel;
      }
    }
    return null;
  }

  deleteChannel(serverId, channelId) {
    const server = this.getServerById(serverId);
    if (server) {
      server.channels = server.channels.filter(c => c.id !== channelId);
      this.data.messages = this.data.messages.filter(m => m.channelId !== channelId);
      this.save();
      return true;
    }
    return false;
  }

  // --- Wiadomości na kanałach ---
  getChannelMessages(channelId, limit = 100) {
    return this.data.messages
      .filter(m => m.channelId === channelId)
      .slice(-limit);
  }

  addMessage(msg) {
    this.data.messages.push(msg);
    this.save();
    return msg;
  }

  // --- Wiadomości Prywatne (PV / DM) ---
  getDirectMessagesBetween(userAId, userBId, limit = 100) {
    return this.data.directMessages
      .filter(dm => 
        (dm.senderId === userAId && dm.recipientId === userBId) ||
        (dm.senderId === userBId && dm.recipientId === userAId)
      )
      .slice(-limit);
  }

  addDirectMessage(dm) {
    this.data.directMessages.push(dm);
    this.save();
    return dm;
  }

  // --- Znajomi i Zaproszenia do znajomych (Discord-style) ---
  getFriendsForUser(userId) {
    const friends = [];
    if (!this.data.friendships) this.data.friendships = [];
    for (const f of this.data.friendships) {
      if (f.status === 'accepted') {
        const friendId = f.user1Id === userId ? f.user2Id : (f.user2Id === userId ? f.user1Id : null);
        if (friendId) {
          const friend = this.findUserById(friendId);
          if (friend) {
            const { passwordHash, ...safe } = friend;
            friends.push(safe);
          }
        }
      }
    }
    return friends;
  }

  getPendingRequestsForUser(userId) {
    if (!this.data.friendships) this.data.friendships = [];
    const incoming = [];
    const outgoing = [];

    for (const f of this.data.friendships) {
      if (f.status === 'pending') {
        const senderId = f.requesterId || f.user1Id;
        const recipientId = (f.user1Id === senderId) ? f.user2Id : f.user1Id;

        if (recipientId === userId) {
          const senderUser = this.findUserById(senderId);
          if (senderUser) {
            const { passwordHash, ...safe } = senderUser;
            incoming.push({
              id: f.id || `${f.user1Id}-${f.user2Id}`,
              senderId,
              user: safe,
              createdAt: f.createdAt
            });
          }
        } else if (senderId === userId) {
          const recipientUser = this.findUserById(recipientId);
          if (recipientUser) {
            const { passwordHash, ...safe } = recipientUser;
            outgoing.push({
              id: f.id || `${f.user1Id}-${f.user2Id}`,
              recipientId,
              user: safe,
              createdAt: f.createdAt
            });
          }
        }
      }
    }
    return { incoming, outgoing };
  }

  sendFriendRequest(requesterId, targetQuery) {
    if (!this.data.friendships) this.data.friendships = [];
    const cleanQuery = targetQuery.trim().toLowerCase().replace(/^@/, '');

    const targetUser = this.data.users.find(u => 
      u.username.toLowerCase() === cleanQuery ||
      (u.email && u.email.toLowerCase() === cleanQuery) ||
      u.id === cleanQuery
    );

    if (!targetUser) {
      return { error: 'Nie znaleziono użytkownika o takiej nazwie. Upewnij się, że nick jest poprawny!' };
    }

    if (targetUser.id === requesterId) {
      return { error: 'Nie możesz wysłać zaproszenia do samego siebie!' };
    }

    const existing = this.data.friendships.find(f => 
      (f.user1Id === requesterId && f.user2Id === targetUser.id) ||
      (f.user1Id === targetUser.id && f.user2Id === requesterId)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: `Użytkownik ${targetUser.displayName || targetUser.username} jest już Twoim znajomym!` };
      }
      if (existing.status === 'pending') {
        const originalRequester = existing.requesterId || existing.user1Id;
        if (originalRequester === requesterId) {
          return { error: 'Wysłałeś już zaproszenie do tego użytkownika. Oczekuje na akceptację!' };
        } else {
          // Druga osoba też wysłała - automatycznie akceptujemy!
          existing.status = 'accepted';
          this.save();
          const { passwordHash, ...safeTarget } = targetUser;
          return { success: true, autoAccepted: true, friend: safeTarget };
        }
      }
    }

    const newRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user1Id: requesterId,
      user2Id: targetUser.id,
      requesterId: requesterId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.data.friendships.push(newRequest);
    this.save();

    const { passwordHash, ...safeTarget } = targetUser;
    return { success: true, request: newRequest, targetUser: safeTarget };
  }

  acceptFriendRequest(userId, senderIdOrRequestId) {
    if (!this.data.friendships) this.data.friendships = [];
    const friendship = this.data.friendships.find(f => 
      f.id === senderIdOrRequestId ||
      ((f.user1Id === userId && f.user2Id === senderIdOrRequestId) || (f.user2Id === userId && f.user1Id === senderIdOrRequestId))
    );

    if (!friendship) {
      return { error: 'Nie znaleziono takiego zaproszenia.' };
    }

    friendship.status = 'accepted';
    this.save();

    const friendId = friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id;
    const friend = this.findUserById(friendId);
    const safeFriend = friend ? (({ passwordHash, ...rest }) => rest)(friend) : null;

    return { success: true, friend: safeFriend, friendId };
  }

  declineOrCancelFriendRequest(userId, targetIdOrRequestId) {
    if (!this.data.friendships) this.data.friendships = [];
    const index = this.data.friendships.findIndex(f => 
      f.id === targetIdOrRequestId ||
      ((f.user1Id === userId && f.user2Id === targetIdOrRequestId) || (f.user2Id === userId && f.user1Id === targetIdOrRequestId))
    );

    if (index !== -1) {
      const removed = this.data.friendships.splice(index, 1)[0];
      this.save();
      const otherUserId = removed.user1Id === userId ? removed.user2Id : removed.user1Id;
      return { success: true, otherUserId };
    }
    return { error: 'Nie znaleziono zaproszenia do usunięcia.' };
  }

  removeFriend(userId, friendId) {
    if (!this.data.friendships) this.data.friendships = [];
    const index = this.data.friendships.findIndex(f => 
      ((f.user1Id === userId && f.user2Id === friendId) || (f.user1Id === friendId && f.user2Id === userId)) &&
      f.status === 'accepted'
    );

    if (index !== -1) {
      this.data.friendships.splice(index, 1);
      this.save();
      return { success: true };
    }
    return { error: 'Nie znaleziono takiego znajomego.' };
  }

  addFriendship(user1Id, user2Id) {
    if (!this.data.friendships) this.data.friendships = [];
    const existing = this.data.friendships.find(f => 
      (f.user1Id === user1Id && f.user2Id === user2Id) ||
      (f.user1Id === user2Id && f.user2Id === user1Id)
    );
    if (existing) {
      existing.status = 'accepted';
    } else {
      this.data.friendships.push({
        id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user1Id,
        user2Id,
        requesterId: user1Id,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });
    }
    this.save();
  }
}

export const db = new JSONDatabase();
