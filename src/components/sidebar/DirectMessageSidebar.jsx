import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, MessageCircle, Phone, Copy, Check, Users } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { BottomUserBar } from '../common/BottomUserBar';
import { useSocket } from '../../context/SocketContext';
import { useVoice } from '../../context/VoiceContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const DirectMessageSidebar = ({
  conversations = [],
  allUsers = [],
  activeDmUser,
  activeDmTab = 'chat', // 'friends' | 'chat'
  incomingRequestsCount = 0,
  onSelectDmUser,
  onOpenFriendsView,
  onOpenSettings,
  onOpenInstallPwa
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, user }
  const [copiedNick, setCopiedNick] = useState(false);
  const { isStandalone } = usePwaInstall();

  const { userStatuses } = useSocket();
  const { startDirectCall } = useVoice();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('contextmenu', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, []);

  const handleUserContextMenu = (e, targetUser) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user: targetUser
    });
  };

  const copyNick = (username) => {
    navigator.clipboard.writeText(`@${username}`);
    setCopiedNick(true);
    setTimeout(() => setCopiedNick(false), 2000);
  };

  const filteredConversations = conversations.filter(conv => {
    const q = searchQuery.toLowerCase();
    const name = (conv.user.displayName || conv.user.username).toLowerCase();
    return name.includes(q) || conv.user.username.toLowerCase().includes(q);
  });

  const availableUsers = allUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    const name = (u.displayName || u.username).toLowerCase();
    return name.includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <div className="w-60 max-w-[calc(100vw-72px)] bg-dark-800 flex flex-col h-full border-r border-dark-900/60 select-none relative">
      {/* Wyszukiwarka na górze */}
      <div className="p-3 border-b border-dark-900/40 shadow-sm flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Szukaj rozmowy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 text-dark-100 placeholder-dark-400 text-xs px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Search size={14} className="absolute right-2.5 top-2 text-dark-400" />
        </div>
        <button
          onClick={() => setShowUserSearch(!showUserSearch)}
          className={`p-1.5 rounded-md transition-colors ${
            showUserSearch ? 'bg-brand-500 text-white' : 'bg-dark-900 text-dark-300 hover:text-white hover:bg-dark-700'
          }`}
          title="Rozpocznij nową rozmowę ze znajomym"
        >
          <UserPlus size={16} />
        </button>
      </div>

      {/* Baner instalacji aplikacji mobilnej */}
      {!isStandalone && onOpenInstallPwa && (
        <div className="mx-2 mt-2 p-2 bg-gradient-to-r from-brand-600/20 to-indigo-600/20 border border-brand-500/30 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-base">📲</span>
            <div className="truncate">
              <div className="text-[11px] font-bold text-white truncate">Aplikacja na telefon</div>
              <div className="text-[9px] text-dark-300 truncate">Zainstaluj na pulpicie</div>
            </div>
          </div>
          <button
            onClick={onOpenInstallPwa}
            className="px-2 py-1 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg text-[10px] font-bold flex-shrink-0 transition-all shadow"
          >
            Pobierz
          </button>
        </div>
      )}

      {/* Lista rozmów lub lista wszystkich użytkowników */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
        {/* Przycisk Znajomi w stylu Discorda */}
        <button
          onClick={() => {
            if (onOpenFriendsView) onOpenFriendsView();
            setShowUserSearch(false);
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors mb-2 group ${
            activeDmTab === 'friends' && !activeDmUser
              ? 'bg-dark-600 text-white shadow-sm'
              : 'text-dark-300 hover:bg-dark-700/60 hover:text-dark-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Users size={18} className={activeDmTab === 'friends' && !activeDmUser ? 'text-white' : 'text-dark-400 group-hover:text-dark-200'} />
            <span className="text-sm">Znajomi</span>
          </div>
          {incomingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-brand-danger text-white rounded-full text-[10px] font-bold">
              {incomingRequestsCount}
            </span>
          )}
        </button>

        {showUserSearch ? (
          <div>
            <div className="px-2 pb-1.5 text-xs font-bold text-brand-500 uppercase tracking-wider">
              Wybierz znajomego
            </div>
            {availableUsers.length === 0 ? (
              <div className="text-xs text-dark-400 text-center py-4">
                Brak użytkowników
              </div>
            ) : (
              availableUsers.map((targetUser) => (
                <button
                  key={targetUser.id}
                  onClick={() => {
                    onSelectDmUser(targetUser);
                    setShowUserSearch(false);
                  }}
                  onContextMenu={(e) => handleUserContextMenu(e, targetUser)}
                  className="w-full flex items-center space-x-2.5 px-2 py-2 rounded-md hover:bg-dark-700/60 text-left transition-colors group"
                >
                  <UserAvatar
                    user={targetUser}
                    size="sm"
                    statusOverride={userStatuses[targetUser.id]}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-dark-100 truncate group-hover:text-white">
                      {targetUser.displayName || targetUser.username}
                    </div>
                    <div className="text-xs text-dark-400 truncate">
                      @{targetUser.username}
                    </div>
                  </div>
                  <MessageCircle size={16} className="text-dark-400 group-hover:text-brand-500" />
                </button>
              ))
            )}
          </div>
        ) : (
          <div>
            <div className="px-2 pb-1.5 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              Wiadomości prywatne
            </div>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-dark-400">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                Brak aktywnych rozmów. Kliknij ikonę u góry, aby rozpocząć czat ze znajomym!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeDmUser?.id === conv.user.id;
                const status = userStatuses[conv.user.id] || conv.user.status;

                return (
                  <button
                    key={conv.user.id}
                    onClick={() => onSelectDmUser(conv.user)}
                    onContextMenu={(e) => handleUserContextMenu(e, conv.user)}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md transition-colors text-left group ${
                      isActive
                        ? 'bg-dark-600 text-white'
                        : 'text-dark-300 hover:bg-dark-700/60 hover:text-dark-100'
                    }`}
                  >
                    <UserAvatar
                      user={conv.user}
                      size="sm"
                      statusOverride={status}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {conv.user.displayName || conv.user.username}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-xs text-dark-400 truncate">
                          {conv.lastMessage.text}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MENU KONTEKSTOWE DLA UŻYTKOWNIKA DM */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[190px] animate-fade-in text-dark-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 150),
            left: Math.min(contextMenu.x, window.innerWidth - 200)
          }}
        >
          <div className="px-3 py-1.5 border-b border-dark-800 mb-1 flex items-center space-x-2">
            <UserAvatar user={contextMenu.user} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {contextMenu.user.displayName || contextMenu.user.username}
              </div>
              <div className="text-[10px] text-dark-400">@{contextMenu.user.username}</div>
            </div>
          </div>

          <button
            onClick={() => {
              onSelectDmUser(contextMenu.user);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
          >
            <MessageCircle size={14} />
            <span>Otwórz rozmowę (PV)</span>
          </button>

          <button
            onClick={() => {
              startDirectCall(contextMenu.user);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
          >
            <Phone size={14} />
            <span>Zadzwoń na PV</span>
          </button>

          <button
            onClick={() => {
              copyNick(contextMenu.user.username);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-dark-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="flex items-center space-x-2">
              <Copy size={14} />
              <span>Kopiuj nick</span>
            </span>
            {copiedNick ? <Check size={14} className="text-emerald-400" /> : null}
          </button>
        </div>
      )}

      {/* Dolny pasek użytkownika */}
      <BottomUserBar onOpenSettings={onOpenSettings} />
    </div>
  );
};
