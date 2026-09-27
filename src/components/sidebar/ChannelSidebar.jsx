import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Volume2, Plus, ChevronDown, UserPlus, LogOut, Trash2, Copy, Check, 
  Lock, Globe, Edit2, MoreVertical, Shield, ArrowRightLeft, Settings, MessageSquare, Phone
} from 'lucide-react';
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
  onOpenEditServer,
  onOpenSettings,
  onLeaveServer,
  onDeleteServer,
  onOpenInstallPwa,
  onOpenUserProfile
}) => {
  const { user } = useAuth();
  const { joinVoiceChannel, activeVoiceChannel, speakingUsers, moveVoiceUser } = useVoice();
  const { voiceStates } = useSocket();
  const { isStandalone } = usePwaInstall();

  // Stany rozwijanych menu
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Menu opcji kanału (otwierane przez LPM lub PPM)
  const [channelActionMenu, setChannelActionMenu] = useState(null); // { x, y, channel }

  // Menu akcji użytkownika na kanale głosowym (LPM lub PPM)
  const [voiceUserMenu, setVoiceUserMenu] = useState(null); // { x, y, user, currentChannelId }

  // Menu szybkiego dodawania kanału z nagłówka kategorii (LPM)
  const [categoryAddMenu, setCategoryAddMenu] = useState(null); // { x, y }

  // Menu kontekstowe pustego pola pod kanałami (PPM)
  const [emptyAreaMenu, setEmptyAreaMenu] = useState(null); // { x, y }

  const menuRef = useRef(null);

  // Zamykanie menu po kliknięciu poza nimi
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setChannelActionMenu(null);
        setVoiceUserMenu(null);
        setCategoryAddMenu(null);
        setEmptyAreaMenu(null);
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
  const userPermissions = server.currentUserPermissions || [];
  const canManageChannels = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_CHANNELS');
  const canManageRoles = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_ROLES');
  const canManageServer = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_SERVER');
  const canMoveMembers = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MOVE_MEMBERS');

  const myRoleIds = (server.memberRoles && user?.id && server.memberRoles[user.id]) || [];
  const isServerAdmin = isOwner || userPermissions.includes('ADMINISTRATOR');

  const checkChannelAccess = (ch) => {
    if (isServerAdmin) return { canView: true, canJoinOrWrite: true };
    if (ch.hideFromUnauthorized && ch.allowedRoleIds && ch.allowedRoleIds.length > 0) {
      const hasAllowedRole = ch.allowedRoleIds.some(rId => myRoleIds.includes(rId));
      if (!hasAllowedRole) return { canView: false, canJoinOrWrite: false };
    }
    if (ch.isPrivate && ch.allowedRoleIds && ch.allowedRoleIds.length > 0) {
      const hasAllowedRole = ch.allowedRoleIds.some(rId => myRoleIds.includes(rId));
      return { canView: true, canJoinOrWrite: hasAllowedRole };
    }
    return { canView: true, canJoinOrWrite: true };
  };

  const textChannels = (server.channels || []).filter(c => c.type === 'text' && checkChannelAccess(c).canView);
  const voiceChannels = (server.channels || []).filter(c => c.type === 'voice' && checkChannelAccess(c).canView);

  const copyInvite = () => {
    if (server.inviteCode) {
      navigator.clipboard.writeText(server.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Obsługa LPM na ikonie opcji kanału (trzy kropki)
  const handleChannelOptionsClick = (e, channel) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setChannelActionMenu({
      x: rect.right + 5,
      y: rect.top,
      channel
    });
  };

  // Obsługa PPM na kanale
  const handleChannelContextMenu = (e, channel) => {
    if (!canManageChannels) return;
    e.preventDefault();
    e.stopPropagation();
    setChannelActionMenu({
      x: e.clientX,
      y: e.clientY,
      channel
    });
  };

  // Obsługa PPM w pustej przestrzeni pod kanałami
  const handleEmptyAreaContextMenu = (e) => {
    if (e.target.closest('.group\\/user') || e.target.closest('.group') || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setChannelActionMenu(null);
    setVoiceUserMenu(null);
    setCategoryAddMenu(null);
    setEmptyAreaMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 180)
    });
  };

  // Obsługa LPM / PPM na użytkowniku na kanale głosowym
  const handleVoiceUserClick = (e, voiceUser, channelId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setVoiceUserMenu({
      x: Math.min(rect.right + 5, window.innerWidth - 220),
      y: Math.min(rect.top, window.innerHeight - 200),
      targetUser: voiceUser,
      channelId
    });
  };

  return (
    <div className="w-60 max-w-[calc(100vw-72px)] bg-dark-800 flex flex-col h-full border-r border-dark-900/60 select-none relative">
      {/* 1. Nagłówek Serwera z rozwijanym menu (LPM) */}
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
            <span className="truncate text-sm">{server.name}</span>
          </div>
          <ChevronDown size={18} className={`text-dark-400 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Menu rozwijane serwera (LPM) */}
        {showServerMenu && (
          <div className="absolute top-14 left-2 right-2 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-fade-in text-dark-100">
            {/* Zaproszenie */}
            <button
              onClick={() => {
                copyInvite();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
            >
              <span className="flex items-center space-x-2">
                <UserPlus size={14} />
                <span>Zaproś znajomych</span>
              </span>
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {/* Utwórz kanał (dla osób z uprawnieniami) */}
            {canManageChannels && (
              <button
                onClick={() => {
                  onOpenCreateChannel('text');
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Plus size={14} className="text-brand-400" />
                <span>Utwórz kanał</span>
              </button>
            )}

            {/* Ustawienia serwera (dla adminów / właściciela) */}
            {(canManageServer || canManageRoles || isOwner) && onOpenEditServer && (
              <button
                onClick={() => {
                  onOpenEditServer(server);
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Settings size={14} className="text-amber-400" />
                <span>Ustawienia serwera</span>
              </button>
            )}

            <div className="h-[1px] bg-dark-800 my-1" />

            {/* Usuń lub Opuść serwer */}
            {isOwner ? (
              <button
                onClick={() => {
                  if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć serwer "${server.name}"?`)) {
                    onDeleteServer(server.id);
                  }
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
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
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
              >
                <LogOut size={14} />
                <span>Opuść serwer</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Baner instalacji aplikacji mobilnej */}
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

      {/* 3. Lista Kanałów Tekstowych i Głosowych */}
      <div 
        onContextMenu={handleEmptyAreaContextMenu}
        className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin"
      >
        {/* KANAŁY TEKSTOWE */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1 text-xs font-semibold text-dark-400 uppercase tracking-wider group">
            <span className="truncate">Kanały tekstowe</span>
            {canManageChannels && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateChannel('text');
                }}
                className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                title="Dodaj kanał tekstowy (LPM)"
              >
                <Plus size={15} />
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isActive = activeChannelId === channel.id;
              const access = checkChannelAccess(channel);

              return (
                <div
                  key={channel.id}
                  onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left group cursor-pointer ${
                    isActive
                      ? 'bg-dark-600 text-white font-medium shadow-sm'
                      : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'
                  }`}
                  onClick={() => onSelectChannel(channel)}
                >
                  <div className="flex items-center space-x-2 min-w-0 truncate">
                    {channel.isPrivate ? (
                      <Lock size={16} className="text-amber-400 flex-shrink-0" title="Kanał prywatny" />
                    ) : (
                      <Hash size={18} className="text-dark-400 group-hover:text-dark-300 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{channel.name}</span>
                    {channel.readOnly && (
                      <span className="text-[9px] px-1 py-0.2 bg-dark-700 text-dark-400 rounded flex-shrink-0" title="Tylko do odczytu">
                        ogłoszenia
                      </span>
                    )}
                  </div>

                  {canManageChannels && (
                    <button
                      onClick={(e) => handleChannelOptionsClick(e, channel)}
                      className="opacity-0 group-hover:opacity-100 hover:text-white hover:bg-dark-700/80 p-1 rounded-md text-dark-400 transition-all"
                      title="Opcje kanału (LPM: Dodaj / Edytuj / Usuń)"
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
            <span className="truncate">Kanały głosowe</span>
            {canManageChannels && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateChannel('voice');
                }}
                className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                title="Dodaj kanał głosowy (LPM)"
              >
                <Plus size={15} />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {voiceChannels.map((channel) => {
              const isConnectedHere = activeVoiceChannel?.channelId === channel.id;
              const rawUsers = voiceStates[channel.id] || [];
              let channelUsers = [...rawUsers];
              // Jeśli jesteśmy połączeni z tym kanałem, a jeszcze nie ma nas w stanie socketu, dodaj nas natychmiast
              if (isConnectedHere && user && !channelUsers.some(u => (u.user?.id || u.id) === user.id)) {
                channelUsers.push(user);
              }
              const access = checkChannelAccess(channel);

              const handleVoiceClick = () => {
                if (!access.canJoinOrWrite) {
                  alert(`🔒 Kanał głosowy "${channel.name}" jest prywatny. Dołączyć mogą tylko wyznaczone role lub Właściciel/Admin.`);
                  return;
                }
                joinVoiceChannel(channel, server.id);
                // Nie zabieraj użytkownikowi czatu tekstowego – jeśli nie ma aktywnego tekstu, otwórz pierwszy tekstowy
                const activeIsText = activeChannelId && textChannels.some(tc => tc.id === activeChannelId);
                if (!activeIsText && textChannels.length > 0 && onSelectChannel) {
                  onSelectChannel(textChannels[0]);
                }
              };

              return (
                <div key={channel.id} className="flex flex-col">
                  {/* Przycisk dołączenia do pokoju */}
                  <div
                    onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                    onClick={handleVoiceClick}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left group cursor-pointer ${
                      isConnectedHere
                        ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                        : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {channel.isPrivate ? (
                        <Lock size={16} className={isConnectedHere ? 'text-emerald-400' : 'text-amber-400'} title="Prywatny kanał głosowy" />
                      ) : (
                        <Volume2 size={18} className={isConnectedHere ? 'text-emerald-400' : 'text-dark-400 group-hover:text-dark-300'} />
                      )}
                      <span className="truncate text-sm">{channel.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {isConnectedHere && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          Połączono
                        </span>
                      )}
                      {canManageChannels && (
                        <button
                          onClick={(e) => handleChannelOptionsClick(e, channel)}
                          className="opacity-0 group-hover:opacity-100 hover:text-white hover:bg-dark-700/80 p-1 rounded-md text-dark-400 transition-all"
                          title="Opcje kanału (LPM: Dodaj / Edytuj / Usuń)"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista użytkowników podpiętych w tym kanale głosowym */}
                  {channelUsers.length > 0 && (
                    <div className="pl-6 pr-1 py-1 space-y-0.5">
                      {channelUsers.map((u) => {
                        const voiceUserObj = u.user || u;
                        const isSpeaking = speakingUsers.has(voiceUserObj.id);
                        return (
                          <div
                            key={voiceUserObj.id || voiceUserObj.socketId}
                            onClick={(e) => handleVoiceUserClick(e, voiceUserObj, channel.id)}
                            className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-dark-700/70 cursor-pointer text-xs text-dark-300 hover:text-white transition-colors group/user"
                            title="Kliknij LPM dla opcji użytkownika (Przenieś / Profil / DM)"
                          >
                            <div className="flex items-center space-x-2 min-w-0 truncate">
                              <UserAvatar
                                user={voiceUserObj}
                                size="xs"
                                showStatus={false}
                                isSpeaking={isSpeaking}
                              />
                              <span className={`truncate text-xs ${isSpeaking ? 'text-emerald-400 font-semibold' : ''}`}>
                                {voiceUserObj.displayName || voiceUserObj.username}
                              </span>
                            </div>

                            {/* Opcje akcji użytkownika głosowego */}
                            <div className="opacity-0 group-hover/user:opacity-100 flex items-center space-x-1">
                              {canMoveMembers && (
                                <span className="p-0.5 rounded text-dark-400 hover:text-brand-400 hover:bg-dark-600" title="Przenieś do innego kanału">
                                  <ArrowRightLeft size={13} />
                                </span>
                              )}
                            </div>
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

      {/* 4. MENU AKCJI KANAŁU (LPM lub PPM na kanale / trzech kropkach) */}
      {channelActionMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[190px] animate-fade-in text-dark-100 space-y-0.5"
          style={{
            top: Math.min(channelActionMenu.y, window.innerHeight - 170),
            left: Math.min(channelActionMenu.x, window.innerWidth - 200)
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider truncate border-b border-dark-800 mb-1 flex items-center space-x-1.5">
            {channelActionMenu.channel.type === 'voice' ? <Volume2 size={12} /> : <Hash size={12} />}
            <span className="truncate">{channelActionMenu.channel.name}</span>
          </div>

          {/* Opcja szybkiego dodania nowego kanału */}
          {canManageChannels && (
            <>
              <button
                onClick={() => {
                  onOpenCreateChannel('text');
                  setChannelActionMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Plus size={14} className="text-brand-400" />
                <span>Dodaj kanał tekstowy</span>
              </button>

              <button
                onClick={() => {
                  onOpenCreateChannel('voice');
                  setChannelActionMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Volume2 size={14} className="text-emerald-400" />
                <span>Dodaj kanał głosowy</span>
              </button>

              <div className="h-[1px] bg-dark-800 my-1" />
            </>
          )}

          {/* Edytuj ten kanał */}
          {canManageChannels && (
            <button
              onClick={() => {
                onOpenEditChannel(channelActionMenu.channel);
                setChannelActionMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
            >
              <Edit2 size={14} />
              <span>Edytuj ten kanał</span>
            </button>
          )}

          {/* Usuń kanał */}
          {canManageChannels && (
            <button
              onClick={() => {
                if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć kanał "${channelActionMenu.channel.name}"?`)) {
                  onDeleteChannel(channelActionMenu.channel.id);
                }
                setChannelActionMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              <span>Usuń ten kanał</span>
            </button>
          )}
        </div>
      )}

      {/* MENU KONTEKSTOWE PUSTEGO POLA POD KANAŁAMI (PPM) */}
      {emptyAreaMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[190px] animate-fade-in text-dark-100 space-y-0.5"
          style={{
            top: emptyAreaMenu.y,
            left: emptyAreaMenu.x
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider truncate border-b border-dark-800 mb-1">
            Opcje serwera
          </div>

          {canManageChannels && (
            <>
              <button
                onClick={() => {
                  onOpenCreateChannel('text');
                  setEmptyAreaMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors text-left cursor-pointer"
              >
                <Plus size={14} className="text-brand-400" />
                <span>Utwórz kanał tekstowy</span>
              </button>

              <button
                onClick={() => {
                  onOpenCreateChannel('voice');
                  setEmptyAreaMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors text-left cursor-pointer"
              >
                <Volume2 size={14} className="text-emerald-400" />
                <span>Utwórz kanał głosowy</span>
              </button>

              <div className="h-[1px] bg-dark-800 my-1" />
            </>
          )}

          {(canManageServer || canManageRoles || isOwner) && onOpenEditServer && (
            <button
              onClick={() => {
                onOpenEditServer(server);
                setEmptyAreaMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors text-left cursor-pointer"
            >
              <Settings size={14} className="text-amber-400" />
              <span>Ustawienia serwera</span>
            </button>
          )}
        </div>
      )}

      {/* 5. MENU AKCJI UŻYTKOWNIKA GŁOSOWEGO (PRZENOSZENIE, PROFIL, PV) */}
      {voiceUserMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[210px] animate-fade-in text-dark-100 space-y-1"
          style={{
            top: voiceUserMenu.y,
            left: voiceUserMenu.x
          }}
        >
          <div className="px-2.5 py-1.5 border-b border-dark-800 flex items-center space-x-2">
            <UserAvatar user={voiceUserMenu.targetUser} size="xs" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {voiceUserMenu.targetUser.displayName || voiceUserMenu.targetUser.username}
              </div>
              <div className="text-[10px] text-dark-400">@{voiceUserMenu.targetUser.username}</div>
            </div>
          </div>

          {/* Opcja Przenieś do innego kanału głosowego */}
          {canMoveMembers && voiceChannels.filter(c => c.id !== voiceUserMenu.channelId).length > 0 && (
            <div className="py-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                Przenieś do kanału:
              </div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto scrollbar-thin">
                {voiceChannels
                  .filter(c => c.id !== voiceUserMenu.channelId)
                  .map(targetCh => (
                    <button
                      key={targetCh.id}
                      onClick={() => {
                        moveVoiceUser(voiceUserMenu.targetUser.id, targetCh.id, server.id);
                        setVoiceUserMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-brand-300 hover:bg-brand-500 hover:text-white rounded-lg transition-colors text-left"
                    >
                      <ArrowRightLeft size={13} className="flex-shrink-0" />
                      <span className="truncate">{targetCh.name}</span>
                    </button>
                  ))}
              </div>
              <div className="h-[1px] bg-dark-800 my-1" />
            </div>
          )}

          {/* Zobacz profil */}
          {onOpenUserProfile && (
            <button
              onClick={() => {
                onOpenUserProfile(voiceUserMenu.targetUser.id);
                setVoiceUserMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
            >
              <UserPlus size={14} />
              <span>Zobacz profil</span>
            </button>
          )}
        </div>
      )}

      {/* 6. Dolny pasek profilu i ustawień */}
      <BottomUserBar onOpenSettings={onOpenSettings} onOpenUserProfile={onOpenUserProfile} />
    </div>
  );
};
