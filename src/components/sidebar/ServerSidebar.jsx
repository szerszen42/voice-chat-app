import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Compass, LogOut, Settings, UserPlus, Hash, Volume2, Trash2, Check, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ServerSidebar = ({
  servers = [],
  activeServerId,
  isDmActive,
  onSelectDm,
  onSelectServer,
  onOpenCreateServer,
  onOpenExploreServers,
  onOpenJoinServer,
  onOpenEditServer,
  onOpenCreateChannel,
  onLeaveServer,
  onDeleteServer
}) => {
  const { user, logout } = useAuth();
  const [contextMenu, setContextMenu] = useState(null); // { x, y, server }
  const [copiedCode, setCopiedCode] = useState(false);
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

  const handleServerContextMenu = (e, server) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      server
    });
  };

  const copyInvite = (code) => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="w-[72px] bg-dark-900 flex flex-col items-center py-3 space-y-2 select-none z-20 h-full border-r border-dark-950/40 relative">
      {/* Przycisk Wiadomości Prywatnych (DM) */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Wskaźnik (biały pasek po lewej) */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            isDmActive ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={onSelectDm}
          className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] flex items-center justify-center transition-all duration-200 ${
            isDmActive
              ? 'bg-brand-500 rounded-[16px] text-white shadow-lg shadow-brand-500/30'
              : 'bg-dark-700 text-dark-100 hover:bg-brand-500 hover:text-white'
          }`}
          title="Wiadomości prywatne"
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] bg-dark-700 rounded my-1" />

      {/* Lista Serwerów Użytkownika */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2 scrollbar-none">
        {servers.map((server) => {
          const isActive = !isDmActive && activeServerId === server.id;
          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Pasek aktywności */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => onSelectServer(server.id)}
                onContextMenu={(e) => handleServerContextMenu(e, server)}
                className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] flex items-center justify-center text-lg font-bold transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'rounded-[16px] text-white ring-2 ring-white/20'
                    : 'text-dark-100 hover:rounded-[16px] hover:text-white'
                }`}
                style={{
                  backgroundColor: server.color || '#5865f2'
                }}
                title={`${server.name} (Prawy klik dla opcji)`}
              >
                {server.icon && server.icon.length <= 2 ? (
                  <span>{server.icon}</span>
                ) : (
                  <span>{server.name.substring(0, 2).toUpperCase()}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Dodaj Serwer (+) */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-dark-700 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm"
            title="Utwórz nowy serwer"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Odkrywaj Publiczne Serwery (Kompas) */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={onOpenExploreServers}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-dark-700 hover:bg-brand-500 text-brand-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm"
            title="Odkrywaj publiczne społeczności"
          >
            <Compass size={24} />
          </button>
        </div>
      </div>

      {/* Przycisk Wyloguj na dole */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-dark-700 hover:bg-red-500 text-dark-400 hover:text-white flex items-center justify-center transition-all duration-200"
          title="Wyloguj się"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* MENU KONTEKSTOWE SERWERA (Prawy klik PPM na ikonę serwera) */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[200px] animate-fade-in text-dark-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 220),
            left: Math.min(contextMenu.x + 10, window.innerWidth - 220)
          }}
        >
          <div className="px-3 py-1.5 text-xs font-bold text-white border-b border-dark-800 mb-1 flex items-center space-x-2">
            <span>{contextMenu.server.icon || '💬'}</span>
            <span className="truncate">{contextMenu.server.name}</span>
          </div>

          {/* Kopiuj zaproszenie */}
          <button
            onClick={() => {
              copyInvite(contextMenu.server.inviteCode);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors font-semibold"
          >
            <span className="flex items-center space-x-2">
              <UserPlus size={14} />
              <span>Zaproś znajomych</span>
            </span>
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {/* Utwórz kanał tekstowy */}
          {contextMenu.server.ownerId === user?.id && (
            <>
              <button
                onClick={() => {
                  onSelectServer(contextMenu.server.id);
                  onOpenCreateChannel('text');
                  setContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Hash size={14} />
                <span>Dodaj kanał tekstowy</span>
              </button>

              {/* Utwórz kanał głosowy */}
              <button
                onClick={() => {
                  onSelectServer(contextMenu.server.id);
                  onOpenCreateChannel('voice');
                  setContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Volume2 size={14} />
                <span>Dodaj kanał głosowy</span>
              </button>

              {/* Ustawienia serwera */}
              <button
                onClick={() => {
                  onOpenEditServer(contextMenu.server);
                  setContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
              >
                <Settings size={14} />
                <span>Ustawienia serwera</span>
              </button>
            </>
          )}

          <div className="h-[1px] bg-dark-800 my-1" />

          {/* Opuść / Usuń serwer */}
          {contextMenu.server.ownerId === user?.id ? (
            <button
              onClick={() => {
                if (confirm(`Czy na pewno chcesz usunąć serwer "${contextMenu.server.name}"?`)) {
                  onDeleteServer(contextMenu.server.id);
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              <span>Usuń serwer</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm(`Czy chcesz opuścić serwer "${contextMenu.server.name}"?`)) {
                  onLeaveServer(contextMenu.server.id);
                }
                setContextMenu(null);
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
  );
};
