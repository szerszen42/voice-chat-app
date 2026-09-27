import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { api } from './utils/api';
import { playMessageSound } from './utils/sounds';
import { X } from 'lucide-react';
import { UserAvatar } from './components/common/UserAvatar';

// Paski boczne
import { ServerSidebar } from './components/sidebar/ServerSidebar';
import { DirectMessageSidebar } from './components/sidebar/DirectMessageSidebar';
import { ChannelSidebar } from './components/sidebar/ChannelSidebar';

// Główny czat
import { ChatArea } from './components/chat/ChatArea';

// Modale i nakładki
import { AuthModal } from './components/auth/AuthModal';
import { CreateServerModal } from './components/modals/CreateServerModal';
import { EditServerModal } from './components/modals/EditServerModal';
import { JoinServerModal } from './components/modals/JoinServerModal';
import { ExploreServersModal } from './components/modals/ExploreServersModal';
import { ProfileSettingsModal } from './components/modals/ProfileSettingsModal';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { EditChannelModal } from './components/modals/EditChannelModal';
import { IncomingCallModal } from './components/voice/IncomingCallModal';
import { ActiveCallOverlay } from './components/voice/ActiveCallOverlay';
import { InstallPwaModal } from './components/modals/InstallPwaModal';
import { FriendsView } from './components/friends/FriendsView';
import { VoiceStage } from './components/voice/VoiceStage';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { useVoice } from './context/VoiceContext';

export const App = () => {
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const { startDirectCall } = useVoice();

  // Widok główny: 'dm' lub 'server'
  const [activeView, setActiveView] = useState('server');
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  // Stan dla Wiadomości Prywatnych (DM / PV) oraz Znajomych (Discord-style)
  const [activeDmTab, setActiveDmTab] = useState('friends'); // 'friends' | 'chat'
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeDmUser, setActiveDmUser] = useState(null);

  // Wiadomości aktualnie otwartego czatu
  const [messages, setMessages] = useState([]);

  // Stan widoku mobilnego: 'sidebar' (lewe menu) | 'chat' (główny czat) | 'members' (prawe menu członków)
  const [mobilePane, setMobilePane] = useState('chat');
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Modale
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [isJoinServerOpen, setIsJoinServerOpen] = useState(false);
  const [isExploreServersOpen, setIsExploreServersOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState('text');
  const [editingChannel, setEditingChannel] = useState(null);
  const [editingServer, setEditingServer] = useState(null);
  const [isInstallPwaOpen, setIsInstallPwaOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);

  const handleOpenUserProfile = (target) => {
    const targetId = typeof target === 'object' ? target?.id : target;
    if (targetId) {
      setSelectedProfileUserId(targetId);
    }
  };

  // Wczytaj serwery, użytkowników i znajomych po zalogowaniu
  useEffect(() => {
    if (!user) return;

    loadServers();
    loadUsersAndConversations();
    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    try {
      const res = await api.getFriends();
      setFriends(res.friends || []);
      setIncomingRequests(res.incoming || []);
      setOutgoingRequests(res.outgoing || []);
    } catch (err) {
      console.error('Błąd wczytywania znajomych:', err);
    }
  };

  const loadServers = async () => {
    try {
      const res = await api.getMyServers();
      setServers(res.servers || []);
      if (res.servers && res.servers.length > 0) {
        if (!activeServerId) {
          selectServer(res.servers[0].id);
        }
      } else {
        selectDmMode();
      }
    } catch (err) {
      console.error('Błąd wczytywania serwerów:', err);
    }
  };

  const loadUsersAndConversations = async () => {
    try {
      const [usersRes, convRes] = await Promise.all([
        api.getAllUsers(),
        api.getConversations()
      ]);
      setAllUsers((usersRes.users || []).filter(u => u.id !== user?.id));
      setConversations(convRes.conversations || []);
    } catch (err) {
      console.error('Błąd wczytywania użytkowników / rozmów:', err);
    }
  };

  // Wybór serwera
  const selectServer = async (serverId) => {
    setActiveView('server');
    setActiveServerId(serverId);
    setActiveDmUser(null);
    setMobilePane('chat');

    try {
      const res = await api.getServer(serverId);
      setActiveServer(res.server);

      // Wybierz pierwszy kanał tekstowy
      const firstTextChannel = (res.server.channels || []).find(c => c.type === 'text');
      if (firstTextChannel) {
        selectChannel(firstTextChannel);
      } else {
        setActiveChannel(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Błąd pobierania serwera:', err);
    }
  };

  // Wybór kanału na serwerze (tekstowy lub głosowy / stream)
  const selectChannel = async (channel) => {
    if (activeChannel?.id && socket && activeChannel.type === 'text') {
      socket.emit('leave-text-channel', { channelId: activeChannel.id });
    }

    setActiveChannel(channel);
    setMobilePane('chat');

    if (channel.type === 'text') {
      if (socket) {
        socket.emit('join-text-channel', { channelId: channel.id });
      }

      try {
        const res = await api.getChannelMessages(channel.id);
        setMessages(res.messages || []);
      } catch (err) {
        console.error('Błąd wczytywania wiadomości kanału:', err);
      }
    }
  };

  // Przełączenie na Wiadomości Prywatne i Znajomych (DM)
  const selectDmMode = () => {
    setActiveView('dm');
    setActiveServerId(null);
    setActiveServer(null);
    setActiveChannel(null);
    setActiveDmUser(null);
    setActiveDmTab('friends');
    setMobilePane('chat');
  };

  // Wybór znajomego do rozmowy PV
  const selectDmUser = async (targetUser) => {
    setActiveView('dm');
    setActiveDmUser(targetUser);
    setActiveDmTab('chat');
    setMobilePane('chat');

    try {
      const res = await api.getDirectMessages(targetUser.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Błąd wczytywania wiadomości DM:', err);
    }
  };

  // Obsługa gestów dotykowych (Swipe na telefonie)
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Przesunięcie poziome o min. 50px dominujące nad pionowym scrollem
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        // Przesunięcie w PRAWO (Swipe Right)
        if (mobilePane === 'members') {
          setMobilePane('chat');
        } else if (mobilePane === 'chat') {
          setMobilePane('sidebar'); // Otwiera serwery i kanały
        }
      } else {
        // Przesunięcie w LEWO (Swipe Left)
        if (mobilePane === 'sidebar') {
          setMobilePane('chat'); // Zamyka lewy panel i wraca do czatu
        } else if (mobilePane === 'chat' && activeView === 'server' && (activeServer?.membersList?.length || 0) > 0) {
          setMobilePane('members'); // Otwiera listę członków
        }
      }
    }
  };

  // Obsługa przychodzących wiadomości z Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewChannelMessage = ({ message, user: msgAuthor }) => {
      if (activeChannel && message.channelId === activeChannel.id) {
        setMessages(prev => [...prev, { ...message, user: msgAuthor }]);
        if (msgAuthor.id !== user?.id) {
          playMessageSound();
        }
      }
    };

    const handleNewDirectMessage = ({ message, sender }) => {
      const isCurrentConversation =
        (activeDmUser && (message.senderId === activeDmUser.id || message.recipientId === activeDmUser.id));

      if (isCurrentConversation) {
        setMessages(prev => [...prev, { ...message, user: sender }]);
      }

      if (message.senderId !== user?.id) {
        playMessageSound();
      }

      // Odśwież listę konwersacji
      loadUsersAndConversations();
    };

    const handleFriendRequestReceived = () => {
      playMessageSound();
      loadFriends();
    };

    const handleFriendAccepted = () => {
      playMessageSound();
      loadFriends();
    };

    const handleFriendRemoved = () => {
      loadFriends();
    };

    const handleServerDataChanged = ({ serverId }) => {
      if (activeServerId === serverId) {
        selectServer(serverId);
      }
    };

    socket.on('new-message', handleNewChannelMessage);
    socket.on('new-direct-message', handleNewDirectMessage);
    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-accepted', handleFriendAccepted);
    socket.on('friend-removed', handleFriendRemoved);
    socket.on('server-data-changed', handleServerDataChanged);

    return () => {
      socket.off('new-message', handleNewChannelMessage);
      socket.off('new-direct-message', handleNewDirectMessage);
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-accepted', handleFriendAccepted);
      socket.off('friend-removed', handleFriendRemoved);
      socket.off('server-data-changed', handleServerDataChanged);
    };
  }, [socket, activeChannel, activeDmUser, activeServerId, user]);

  // Wysyłanie wiadomości z załącznikami
  const handleSendMessage = (text, attachments = []) => {
    const hasText = text && text.trim().length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!socket || (!hasText && !hasAttachments)) return;

    if (activeView === 'server' && activeChannel) {
      socket.emit('send-message', {
        channelId: activeChannel.id,
        serverId: activeServer?.id,
        text: (text || '').trim(),
        attachments
      });
    } else if (activeView === 'dm' && activeDmUser) {
      socket.emit('send-direct-message', {
        recipientId: activeDmUser.id,
        text: (text || '').trim(),
        attachments
      });
    }
  };

  // Obsługa utworzenia / dołączenia do serwera
  const handleServerCreatedOrJoined = (newServer) => {
    setServers(prev => {
      if (prev.some(s => s.id === newServer.id)) return prev;
      return [...prev, newServer];
    });
    selectServer(newServer.id);
  };

  // Obsługa opuszczenia / usunięcia serwera
  const handleLeaveOrDeleteServer = async (serverId) => {
    try {
      if (activeServer?.ownerId === user?.id) {
        await api.deleteServer(serverId);
      } else {
        await api.leaveServer(serverId);
      }
      setServers(prev => prev.filter(s => s.id !== serverId));
      if (servers.length > 1) {
        const next = servers.find(s => s.id !== serverId);
        selectServer(next.id);
      } else {
        selectDmMode();
      }
    } catch (err) {
      alert(err.message || 'Wystąpił błąd.');
    }
  };

  // Obsługa edycji serwera
  const handleSaveEditedServer = async (serverId, updates) => {
    try {
      const res = await api.updateServer(serverId, updates);
      const updated = res.server;

      setServers(prev => prev.map(s => s.id === serverId ? updated : s));
      if (activeServer?.id === serverId) {
        setActiveServer(prev => ({ ...prev, ...updated }));
      }
    } catch (err) {
      alert(err.message || 'Nie udało się zaktualizować serwera.');
    }
  };

  // Obsługa utworzenia kanału
  const handleChannelCreated = (newChannel) => {
    if (activeServer) {
      setActiveServer(prev => ({
        ...prev,
        channels: [...(prev.channels || []), newChannel]
      }));
      if (newChannel.type === 'text') {
        selectChannel(newChannel);
      }
    }
  };

  // Obsługa edycji kanału
  const handleSaveEditedChannel = async (channelId, updates) => {
    if (!activeServer) return;
    const res = await api.editChannel(activeServer.id, channelId, updates);
    const updatedChannel = res.channel;

    setActiveServer(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.id === channelId ? updatedChannel : c)
    }));

    if (activeChannel?.id === channelId) {
      setActiveChannel(updatedChannel);
    }
  };

  // Obsługa usunięcia kanału
  const handleDeleteChannel = async (channelId) => {
    if (!activeServer) return;
    try {
      await api.deleteChannel(activeServer.id, channelId);

      const remainingChannels = (activeServer.channels || []).filter(c => c.id !== channelId);
      setActiveServer(prev => ({
        ...prev,
        channels: remainingChannels
      }));

      // Jeśli usunięto aktywny kanał tekstowy, przełącz na pierwszy dostępny
      if (activeChannel?.id === channelId) {
        const nextText = remainingChannels.find(c => c.type === 'text');
        if (nextText) {
          selectChannel(nextText);
        } else {
          setActiveChannel(null);
          setMessages([]);
        }
      }
    } catch (err) {
      alert(err.message || 'Nie udało się usunąć kanału.');
    }
  };

  if (authLoading) {
    return (
      <div className="w-screen h-screen bg-dark-900 flex items-center justify-center text-white font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Wczytywanie aplikacji VoiceChat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div
      className="flex h-screen w-screen bg-dark-900 overflow-hidden select-none relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Backdrop dla wysuwanego paska bocznego na telefonie */}
      {mobilePane === 'sidebar' && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity animate-fade-in"
          onClick={() => setMobilePane('chat')}
        />
      )}

      {/* 2. Nawigacja boczna: Serwery + Kanały / Wiadomości Prywatne */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex h-full max-w-[88vw] shadow-2xl transition-transform duration-300 ease-out md:static md:max-w-none md:shadow-none md:translate-x-0 ${
          mobilePane === 'sidebar' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Kolumna ikon serwerów */}
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          isDmActive={activeView === 'dm'}
          onSelectDm={selectDmMode}
          onSelectServer={selectServer}
          onOpenCreateServer={() => setIsCreateServerOpen(true)}
          onOpenExploreServers={() => setIsExploreServersOpen(true)}
          onOpenJoinServer={() => setIsJoinServerOpen(true)}
          onOpenEditServer={(server) => setEditingServer(server)}
          onOpenCreateChannel={(type = 'text') => {
            setCreateChannelType(type);
            setIsCreateChannelOpen(true);
          }}
          onLeaveServer={handleLeaveOrDeleteServer}
          onDeleteServer={handleLeaveOrDeleteServer}
        />

        {/* Kolumna kanałów lub konwersacji */}
        {activeView === 'dm' ? (
          <DirectMessageSidebar
            conversations={conversations}
            allUsers={allUsers}
            friends={friends}
            activeDmUser={activeDmUser}
            activeDmTab={activeDmTab}
            incomingRequestsCount={incomingRequests.length}
            onSelectDmUser={selectDmUser}
            onOpenFriendsView={() => {
              setActiveDmUser(null);
              setActiveDmTab('friends');
              setMobilePane('chat');
            }}
            onOpenSettings={() => setIsProfileSettingsOpen(true)}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
            onOpenUserProfile={handleOpenUserProfile}
          />
        ) : (
          <ChannelSidebar
            server={activeServer}
            activeChannelId={activeChannel?.id}
            onSelectChannel={selectChannel}
            onOpenCreateChannel={(type = 'text') => {
              setCreateChannelType(type);
              setIsCreateChannelOpen(true);
            }}
            onOpenEditChannel={(channel) => setEditingChannel(channel)}
            onDeleteChannel={handleDeleteChannel}
            onOpenEditServer={(server) => setEditingServer(server)}
            onOpenSettings={() => setIsProfileSettingsOpen(true)}
            onLeaveServer={handleLeaveOrDeleteServer}
            onDeleteServer={handleLeaveOrDeleteServer}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}
      </div>

      {/* 3. Główny obszar: Znajomi (FriendsView), Scena Głosowa/Stream (VoiceStage) lub Czat (ChatArea) */}
      <div className="flex-1 flex flex-col h-full min-w-0 z-10">
        {activeView === 'dm' && !activeDmUser ? (
          <FriendsView
            friends={friends}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            allUsers={allUsers}
            onSelectDmUser={(targetUser) => {
              selectDmUser(targetUser);
            }}
            onRefreshFriends={loadFriends}
            onOpenMobileSidebar={() => setMobilePane(prev => prev === 'sidebar' ? 'chat' : 'sidebar')}
            onOpenUserProfile={handleOpenUserProfile}
          />
        ) : activeView === 'server' && activeChannel?.type === 'voice' ? (
          <VoiceStage onOpenUserProfile={handleOpenUserProfile} />
        ) : (
          <ChatArea
            server={activeServer}
            channel={activeView === 'server' ? activeChannel : null}
            dmUser={activeView === 'dm' ? activeDmUser : null}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSelectDmUser={(targetUser) => {
              selectDmUser(targetUser);
              setMobilePane('chat');
            }}
            serverMembers={activeServer?.membersList || []}
            onToggleMobileSidebar={() => setMobilePane(prev => prev === 'sidebar' ? 'chat' : 'sidebar')}
            onToggleMobileMembers={() => setMobilePane(prev => prev === 'members' ? 'chat' : 'members')}
            mobilePane={mobilePane}
            onOpenUserProfile={handleOpenUserProfile}
            onRefreshServer={(id) => selectServer(id || activeServerId)}
          />
        )}
      </div>

      {/* 4. Backdrop dla wysuwanego panelu członków na telefonie */}
      {mobilePane === 'members' && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity animate-fade-in"
          onClick={() => setMobilePane('chat')}
        />
      )}

      {/* 5. Wysuwany panel członków na telefonie */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-64 max-w-[80vw] bg-dark-800 border-l border-dark-900/60 flex flex-col h-full py-3 px-2 shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobilePane === 'members' ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-2.5 border-b border-dark-700/60 mb-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Członkowie ({activeServer?.membersList?.length || 0})
          </span>
          <button
            onClick={() => setMobilePane('chat')}
            className="p-1 rounded-md text-dark-400 hover:text-white hover:bg-dark-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {(activeServer?.membersList || []).map((member) => (
            <div
              key={member.id}
              onClick={() => {
                handleOpenUserProfile(member.id);
                setMobilePane('chat');
              }}
              className="flex items-center space-x-2.5 px-2 py-2 rounded-md hover:bg-dark-700/60 cursor-pointer text-dark-200"
            >
              <UserAvatar user={member} size="sm" />
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-semibold truncate"
                  style={{ color: member.highestRole?.color || '#ffffff' }}
                >
                  {member.displayName || member.username}
                </div>
                {member.customStatus ? (
                  <div className="text-[10px] text-dark-400 truncate">{member.customStatus}</div>
                ) : member.highestRole && member.highestRole.id !== 'role-everyone' ? (
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: member.highestRole.color }}>
                    {member.highestRole.name}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Nakładka przychodzącego połączenia 1-na-1 */}
      <IncomingCallModal />

      {/* 7. Nakładka aktywnego połączenia 1-na-1 */}
      <ActiveCallOverlay />

      {/* 8. Modale funkcyjne */}
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onServerCreated={handleServerCreatedOrJoined}
        onOpenJoinModal={() => {
          setIsCreateServerOpen(false);
          setIsJoinServerOpen(true);
        }}
      />

      <EditServerModal
        isOpen={Boolean(editingServer)}
        server={editingServer}
        onClose={() => setEditingServer(null)}
        onSave={handleSaveEditedServer}
        onRefreshServer={(id) => selectServer(id || activeServerId)}
        onDeleteServer={editingServer?.ownerId === user?.id ? handleLeaveOrDeleteServer : null}
      />

      <JoinServerModal
        isOpen={isJoinServerOpen}
        onClose={() => setIsJoinServerOpen(false)}
        onServerJoined={handleServerCreatedOrJoined}
      />

      <ExploreServersModal
        isOpen={isExploreServersOpen}
        onClose={() => setIsExploreServersOpen(false)}
        onServerJoined={handleServerCreatedOrJoined}
        currentServerIds={servers.map(s => s.id)}
      />

      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
      />

      <UserProfileModal
        userId={selectedProfileUserId}
        isOpen={Boolean(selectedProfileUserId)}
        onClose={() => setSelectedProfileUserId(null)}
        onStartDm={(targetUser) => {
          selectDmUser(targetUser);
        }}
        onStartCall={(targetUser) => {
          startDirectCall(targetUser);
        }}
        onSelectServer={(serverId) => {
          selectServer(serverId);
        }}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        serverId={activeServer?.id}
        initialType={createChannelType}
        onChannelCreated={handleChannelCreated}
      />

      <EditChannelModal
        isOpen={Boolean(editingChannel)}
        channel={editingChannel}
        onClose={() => setEditingChannel(null)}
        onSave={handleSaveEditedChannel}
      />

      <InstallPwaModal
        isOpen={isInstallPwaOpen}
        onClose={() => setIsInstallPwaOpen(false)}
      />
    </div>
  );
};
