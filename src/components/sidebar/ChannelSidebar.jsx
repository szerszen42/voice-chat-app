import React, { useState, useEffect, useRef } from 'react';
import { Hash, Volume2, Plus, ChevronDown, UserPlus, LogOut, Trash2, Copy, Check, Lock, Globe, Edit2, MoreVertical } from 'lucide-react';
import { BottomUserBar } from '../common/BottomUserBar';
import { UserAvatar } from '../common/UserAvatar';
import { useVoice } from '../../context/VoiceContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const ChannelSidebar = ({
  server,
  activeChannelId,
  onSelectChannel,
  onOpenCreateChannel,
  onOpenEditChannel,
  onDeleteChannel,
  onOpenSettings,
  onLeaveServer,
  onDeleteServer,
  onOpenInstallPwa,
  onOpenUserProfile
}) => {
  const { user } = useAuth();
  const { joinVoiceChannel, activeVoiceChannel, speakingUsers } = useVoice();
  const { voiceStates } = useSocket();
  const { isStandalone } = usePwaInstall();
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Stan menu kontekstowego kanału (prawy klik)
  const [contextMenu, setContextMenu] = useState(null); // { x, y, channel }
  const menuRef = useRef(null);

  // Zamykanie menu po kliknięciu poza nim
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

  if (!server) return null;

  const isOwner = server.ownerId === user?.id;
  const textChannels = (server.channels || []).filter(c => c.type === 'text');
  const voiceChannels = (server.channels || []).filter(c => c.type === 'voice');

  const copyInvite = () => {
    if (server.inviteCode) {
      navigator.clipboard.writeText(server.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleChannelContextMenu = (e, channel) => {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      channel
    });
  };

  return (
    <div className="w-60 max-w-[calc(100vw-72px)] bg-dark-800 flex flex-col h-full border-r border-dark-900/60 select-none relative">
      {/* Nagłówek Serwera z rozwijanym menu */}
      <div className="relative">
        <button
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="w-full h-12 px-4 border-b border-dark-900/40 shadow-sm flex items-center justify-between font-bold text-dark-100 hover:bg-dark-700/60 transition-colors"
        >
          <div className="flex items-center space-x-2 truncate">
            {server.isPublic ? (
              <Globe size={16} className="text-brand-500 flex-shrink-0" title="Serwer publiczny" />
            ) : (
              <Lock size={16} className="text-amber-500 flex-shrink-0" title="Serwer prywatny" />
            )}
            <span className="truncate">{server.name}</span>
          </div>
          <ChevronDown size={18} className={`text-dark-400 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Menu rozwijane serwera */}
        {showServerMenu && (
          <div className="absolute top-14 left-2 right-2 bg-dark-900 border border-dark-700 rounded-lg shadow-xl p-1.5 z-30 space-y-1">
            <button
              onClick={() => {
                copyInvite();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-brand-500 hover:bg-brand-500 hover:text-white rounded transition-colors"
            >
              <span className="flex items-center space-x-2">
                <UserPlus size={14} />
                <span>Zaproś znajomych</span>
              </span>
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            </button>

            {isOwner && (
              <button
                onClick={() => {
                  onOpenCreateChannel('text');
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-300 hover:bg-dark-700 hover:text-white rounded transition-colors"
              >
                <Plus size={14} />
                <span>Utwórz kanał</span>
              </button>
            )}

            <div className="h-[1px] bg-dark-700 my-1" />

            {isOwner ? (
              <button
                onClick={() => {
                  if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć serwer "${server.name}"?`)) {
                    onDeleteServer(server.id);
                  }
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
              >
                <Trash2 size={14} />
                <span>Usuń serwer</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm(`Czy chcesz opuścić serwer "${server.name}"?`)) {
                    onLeaveServer(server.id);
                  }
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
              >
                <LogOut size={14} />
                <span>Opuść serwer</span>
              </button>
            )}
          </div>
        )}
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

      {/* Lista Kanałów Tekstowych i Głosowych */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
        {/* KANAŁY TEKSTOWE */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1 text-xs font-semibold text-dark-400 uppercase tracking-wider group">
            <span>Kanały tekstowe</span>
            {isOwner && (
              <button
                onClick={() => onOpenCreateChannel('text')}
                className="opacity-0 group-hover:opacity-100 hover:text-dark-100 transition-opacity"
                title="Dodaj kanał tekstowy"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isActive = activeChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left group cursor-pointer ${
                    isActive
                      ? 'bg-dark-600 text-white font-medium'
                      : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'
                  }`}
                  onClick={() => onSelectChannel(channel)}
                >
                  <div className="flex items-center space-x-2 min-w-0 truncate">
                    <Hash size={18} className="text-dark-400 group-hover:text-dark-300 flex-shrink-0" />
                    <span className="truncate text-sm">{channel.name}</span>
                  </div>

                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChannelContextMenu(e, channel);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 rounded text-dark-400 transition-opacity"
                      title="Opcje kanału"
                    >
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* KANAŁY GŁOSOWE (WebRTC) */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1 text-xs font-semibold text-dark-400 uppercase tracking-wider group">
            <span>Kanały głosowe</span>
            {isOwner && (
              <button
                onClick={() => onOpenCreateChannel('voice')}
                className="opacity-0 group-hover:opacity-100 hover:text-dark-100 transition-opacity"
                title="Dodaj kanał głosowy"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {voiceChannels.map((channel) => {
              const isConnectedHere = activeVoiceChannel?.channelId === channel.id;
              const channelUsers = voiceStates[channel.id] || [];

              return (
                <div key={channel.id} className="flex flex-col">
                  {/* Przycisk dołączenia do pokoju */}
                  <div
                    onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                    onClick={() => {
                      joinVoiceChannel(channel, server.id);
                      if (onSelectChannel) onSelectChannel(channel);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left group cursor-pointer ${
                      isConnectedHere
                        ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                        : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Volume2 size={18} className={isConnectedHere ? 'text-emerald-400' : 'text-dark-400 group-hover:text-dark-300'} />
                      <span className="truncate text-sm">{channel.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {isConnectedHere && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          Aktywny
                        </span>
                      )}
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChannelContextMenu(e, channel);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 rounded text-dark-400 transition-opacity"
                          title="Opcje kanału"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista użytkowników podpiętych w tym kanale głosowym */}
                  {channelUsers.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-1">
                      {channelUsers.map((u) => {
                        const isSpeaking = speakingUsers.has(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenUserProfile) {
                                onOpenUserProfile(u.id);
                              }
                            }}
                            className="flex items-center space-x-2 py-0.5 px-1.5 rounded hover:bg-dark-700/60 cursor-pointer text-xs text-dark-300 hover:text-white transition-colors"
                            title="Kliknij, aby otworzyć profil"
                          >
                            <UserAvatar
                              user={u}
                              size="sm"
                              showStatus={false}
                              isSpeaking={isSpeaking}
                            />
                            <span className={`truncate ${isSpeaking ? 'text-emerald-400 font-medium' : ''}`}>
                              {u.displayName || u.username}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MENU KONTEKSTOWE KANAŁU (Prawy klik) */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[170px] animate-fade-in text-dark-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 120),
            left: Math.min(contextMenu.x, window.innerWidth - 180)
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider truncate border-b border-dark-800 mb-1">
            {contextMenu.channel.name}
          </div>

          <button
            onClick={() => {
              onOpenEditChannel(contextMenu.channel);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
          >
            <Edit2 size={14} />
            <span>Edytuj kanał</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć kanał "${contextMenu.channel.name}"?`)) {
                onDeleteChannel(contextMenu.channel.id);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors mt-0.5"
          >
            <Trash2 size={14} />
            <span>Usuń kanał</span>
          </button>
        </div>
      )}

      {/* Dolny pasek profilu i ustawień */}
      <BottomUserBar onOpenSettings={onOpenSettings} onOpenUserProfile={onOpenUserProfile} />
    </div>
  );
};
