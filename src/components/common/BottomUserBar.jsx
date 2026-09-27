import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Headphones, Settings, PhoneOff, Check, ChevronRight, Volume2, LogOut, User, MonitorUp, MonitorOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { useSocket } from '../../context/SocketContext';
import { UserAvatar } from './UserAvatar';

export const BottomUserBar = ({ onOpenSettings }) => {
  const { user, updateProfile, logout } = useAuth();
  const { socket } = useSocket();
  const {
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    activeVoiceChannel,
    leaveVoiceChannel,
    speakingUsers,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    changeAudioInputDevice,
    changeAudioOutputDevice,
    refreshAudioDevices,
    playTestSound
  } = useVoice();

  // Stan menu kontekstowych
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showOutputMenu, setShowOutputMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const micMenuRef = useRef(null);
  const outputMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Zamykanie menu po kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (micMenuRef.current && !micMenuRef.current.contains(e.target)) {
        setShowMicMenu(false);
      }
      if (outputMenuRef.current && !outputMenuRef.current.contains(e.target)) {
        setShowOutputMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const isSpeaking = speakingUsers.has(user.id);

  const handleMicContextMenu = (e) => {
    e.preventDefault();
    refreshAudioDevices(true);
    setShowMicMenu(prev => !prev);
    setShowOutputMenu(false);
    setShowProfileMenu(false);
  };

  const handleOutputContextMenu = (e) => {
    e.preventDefault();
    refreshAudioDevices(true);
    setShowOutputMenu(prev => !prev);
    setShowMicMenu(false);
    setShowProfileMenu(false);
  };

  const handleProfileContextMenu = (e) => {
    e.preventDefault();
    setShowProfileMenu(prev => !prev);
    setShowMicMenu(false);
    setShowOutputMenu(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateProfile({ status: newStatus });
      if (socket) {
        socket.emit('set-status', { status: newStatus });
      }
      setShowProfileMenu(false);
    } catch (e) {
      console.warn('Status change error:', e);
    }
  };

  const statusOptions = [
    { id: 'online', label: 'Dostępny', dot: 'bg-emerald-500' },
    { id: 'idle', label: 'Zaraz wracam', dot: 'bg-amber-500' },
    { id: 'dnd', label: 'Nie przeszkadzać', dot: 'bg-red-500' },
    { id: 'offline', label: 'Niewidoczny', dot: 'bg-neutral-500' }
  ];

  return (
    <div className="bg-dark-900 px-3 py-2 flex flex-col border-t border-dark-950/40 relative">
      {/* Pasek aktywnego kanału głosowego (jeśli połączono) */}
      {activeVoiceChannel && (
        <div className="mb-2 px-2.5 py-1.5 bg-dark-800 rounded-lg flex items-center justify-between border border-emerald-500/30">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="truncate text-xs">
              <span className="text-emerald-400 font-semibold block">Połączono z głosem</span>
              <span className="text-dark-300 truncate">{activeVoiceChannel.channelName}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-1.5 rounded-md transition-colors ${
                isScreenSharing
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'hover:bg-dark-700 text-dark-300 hover:text-white'
              }`}
              title={isScreenSharing ? 'Zatrzymaj udostępnianie ekranu' : 'Udostępnij ekran'}
            >
              {isScreenSharing ? <MonitorOff size={16} /> : <MonitorUp size={16} />}
            </button>
            <button
              onClick={() => leaveVoiceChannel(true)}
              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
              title="Rozłącz się z kanałem"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>
      )}

      {/* POPUP MENU: Wybór Statusu i Opcje Profilu (Prawy klik na profil) */}
      {showProfileMenu && (
        <div
          ref={profileMenuRef}
          className="absolute bottom-14 left-2 right-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-2 z-50 text-dark-100 animate-fade-in"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase tracking-wider">
            Zmień status
          </div>

          <div className="mt-1 space-y-0.5">
            {statusOptions.map((st) => {
              const isSelected = user.status === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => handleStatusChange(st.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-dark-700 font-semibold text-white'
                      : 'hover:bg-dark-700/60 text-dark-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                    <span>{st.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-brand-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-1 border-t border-dark-700 space-y-0.5">
            <button
              onClick={() => {
                setShowProfileMenu(false);
                onOpenSettings();
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
            >
              <User size={14} />
              <span>Edytuj profil</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={14} />
              <span>Wyloguj się</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MENU: Wybór Mikrofonu (Input) */}
      {showMicMenu && (
        <div
          ref={micMenuRef}
          className="absolute bottom-14 left-2 right-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-2 z-50 text-dark-100 animate-fade-in"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-brand-400">
              <Mic size={14} />
              <span>Wybierz mikrofon</span>
            </span>
          </div>

          <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => {
                changeAudioInputDevice('default');
                setShowMicMenu(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                selectedAudioInput === 'default'
                  ? 'bg-brand-500/20 text-brand-400 font-semibold'
                  : 'hover:bg-dark-700 text-dark-200'
              }`}
            >
              <span className="truncate">Domyślny mikrofon systemu</span>
              {selectedAudioInput === 'default' && <Check size={14} className="flex-shrink-0 ml-1 text-brand-400" />}
            </button>

            {audioInputDevices.map((device, idx) => {
              const isSelected = selectedAudioInput === device.deviceId;
              return (
                <button
                  key={device.deviceId || idx}
                  onClick={() => {
                    changeAudioInputDevice(device.deviceId);
                    setShowMicMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-brand-500/20 text-brand-400 font-semibold'
                      : 'hover:bg-dark-700 text-dark-200'
                  }`}
                >
                  <span className="truncate">{device.label || `Mikrofon ${idx + 1}`}</span>
                  {isSelected && <Check size={14} className="flex-shrink-0 ml-1 text-brand-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-1 border-t border-dark-700 flex justify-between items-center px-1">
            <button
              onClick={() => {
                setShowMicMenu(false);
                onOpenSettings();
              }}
              className="text-[11px] text-brand-400 hover:underline flex items-center space-x-1"
            >
              <span>Więcej ustawień audio</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* POPUP MENU: Wybór Słuchawek / Wyjścia dźwięku (Output) */}
      {showOutputMenu && (
        <div
          ref={outputMenuRef}
          className="absolute bottom-14 left-2 right-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-2 z-50 text-dark-100 animate-fade-in"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-emerald-400">
              <Headphones size={14} />
              <span>Wybierz słuchawki</span>
            </span>
          </div>

          <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => {
                changeAudioOutputDevice('default');
                setShowOutputMenu(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                selectedAudioOutput === 'default'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'hover:bg-dark-700 text-dark-200'
              }`}
            >
              <span className="truncate">Domyślne wyjście systemu</span>
              {selectedAudioOutput === 'default' && <Check size={14} className="flex-shrink-0 ml-1 text-emerald-400" />}
            </button>

            {audioOutputDevices.map((device, idx) => {
              const isSelected = selectedAudioOutput === device.deviceId;
              return (
                <button
                  key={device.deviceId || idx}
                  onClick={() => {
                    changeAudioOutputDevice(device.deviceId);
                    setShowOutputMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                      : 'hover:bg-dark-700 text-dark-200'
                  }`}
                >
                  <span className="truncate">{device.label || `Słuchawki ${idx + 1}`}</span>
                  {isSelected && <Check size={14} className="flex-shrink-0 ml-1 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-1 border-t border-dark-700 flex justify-between items-center px-1">
            <button
              onClick={playTestSound}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <Volume2 size={12} />
              <span>Test dźwięku</span>
            </button>
            <button
              onClick={() => {
                setShowOutputMenu(false);
                onOpenSettings();
              }}
              className="text-[11px] text-brand-400 hover:underline flex items-center space-x-1"
            >
              <span>Ustawienia</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Główny pasek użytkownika */}
      <div className="flex items-center justify-between">
        {/* Awatar i nazwa (Lewy klik: otwiera ustawienia, Prawy klik PPM: menu statusu i profilu) */}
        <div
          onClick={onOpenSettings}
          onContextMenu={handleProfileContextMenu}
          className="flex items-center space-x-2.5 min-w-0 p-1 -ml-1 rounded-md hover:bg-dark-700/60 cursor-pointer group transition-colors"
          title="Lewy klik: Ustawienia | Prawy klik: Zmień status"
        >
          <UserAvatar user={user} size="sm" isSpeaking={isSpeaking} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-dark-100 truncate group-hover:text-white leading-tight">
              {user.displayName || user.username}
            </div>
            <div className="text-xs text-dark-400 truncate leading-tight">
              {user.customStatus || `@${user.username}`}
            </div>
          </div>
        </div>

        {/* Kontrolki Audio i Ustawień */}
        <div className="flex items-center space-x-0.5 text-dark-400">
          {/* Mikrofon */}
          <button
            onClick={toggleMute}
            onContextMenu={handleMicContextMenu}
            className={`p-1.5 rounded-md hover:bg-dark-700 transition-colors relative group ${
              isMuted ? 'text-red-400 hover:text-red-300' : 'hover:text-dark-100'
            } ${showMicMenu ? 'bg-dark-700 ring-1 ring-brand-500 text-white' : ''}`}
            title="Lewy klik: Wycisz | Prawy klik: Zmień mikrofon"
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Słuchawki */}
          <button
            onClick={toggleDeafen}
            onContextMenu={handleOutputContextMenu}
            className={`p-1.5 rounded-md hover:bg-dark-700 transition-colors relative group ${
              isDeafened ? 'text-red-400 hover:text-red-300' : 'hover:text-dark-100'
            } ${showOutputMenu ? 'bg-dark-700 ring-1 ring-emerald-500 text-white' : ''}`}
            title="Lewy klik: Wyłącz dźwięk | Prawy klik: Zmień słuchawki"
          >
            <Headphones size={18} />
          </button>

          {/* Ustawienia */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-dark-700 hover:text-dark-100 transition-colors"
            title="Ustawienia użytkownika"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
