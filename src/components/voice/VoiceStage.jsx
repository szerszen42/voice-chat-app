import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Mic, 
  MicOff, 
  Headphones, 
  PhoneOff, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  MonitorUp, 
  MonitorOff, 
  Radio, 
  Sparkles 
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useVoice } from '../../context/VoiceContext';
import { useAuth } from '../../context/AuthContext';

export const VoiceStage = ({ onOpenUserProfile }) => {
  const { user } = useAuth();
  const {
    activeVoiceChannel,
    voiceUsers = [],
    speakingUsers = new Set(),
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    leaveVoiceChannel,
    isScreenSharing,
    localScreenStream,
    remoteScreenStreams = new Map(), // socketId -> { user, stream }
    startScreenShare,
    stopScreenShare
  } = useVoice();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState('local'); // 'local' lub socketId
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Lista wszystkich dostępnych streamów ekranu (lokalny + zdalne) - memoizowana
  const allStreams = useMemo(() => {
    const list = [];
    if (isScreenSharing && localScreenStream) {
      list.push({
        id: 'local',
        user,
        stream: localScreenStream,
        isLocal: true
      });
    }
    remoteScreenStreams.forEach((val, socketId) => {
      if (val?.stream) {
        list.push({
          id: socketId,
          user: val.user,
          stream: val.stream,
          isLocal: false
        });
      }
    });
    return list;
  }, [isScreenSharing, localScreenStream, remoteScreenStreams, user]);

  // Ustawienie aktywnego streamu do wyświetlania w głównym oknie
  const activeStream = useMemo(() => {
    return allStreams.find(s => s.id === selectedStreamId) || allStreams[0] || null;
  }, [allStreams, selectedStreamId]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !activeStream?.stream) return;

    // Przypisuj srcObject TYLKO wtedy, gdy stream faktycznie uległ zmianie (zapobiega czarnemu ekranowi co 1s)
    if (videoEl.srcObject !== activeStream.stream) {
      videoEl.srcObject = activeStream.stream;
    }

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Video play error:', err);
        }
      });
    }
  }, [activeStream?.stream]);

  if (!activeVoiceChannel) return null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-dark-900/90 flex flex-col h-full overflow-hidden select-none relative"
    >
      {/* GÓRNY PASEK SCENY GŁOSOWEJ */}
      <div className="h-12 px-4 border-b border-dark-950/60 bg-dark-900/95 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate flex items-center space-x-2">
              <span>{activeVoiceChannel.channelName}</span>
              {allStreams.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-dark-400">
              {voiceUsers.length} {voiceUsers.length === 1 ? 'uczestnik' : 'uczestników'} w kanale
            </div>
          </div>
        </div>

        {/* PRZYCISKI KONTROLNE GŁOSU I STREAMU */}
        <div className="flex items-center space-x-2">
          {/* Przycisk Udostępniania Ekranu (Stream) */}
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow ${
              isScreenSharing
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-brand-500 hover:bg-brand-600 text-white active:scale-95'
            }`}
            title={isScreenSharing ? 'Zatrzymaj udostępnianie ekranu' : 'Udostępnij swój ekran znajomym'}
          >
            {isScreenSharing ? <MonitorOff size={16} /> : <MonitorUp size={16} />}
            <span className="hidden sm:inline">
              {isScreenSharing ? 'Zatrzymaj stream' : 'Udostępnij ekran'}
            </span>
          </button>

          {/* Przycisk Pełnego Ekranu */}
          {activeStream && (
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-200 hover:text-white rounded-lg transition-colors"
              title="Pełny ekran"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Przycisk Rozłączenia */}
          <button
            onClick={() => leaveVoiceChannel(true)}
            className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
            title="Opuść kanał głosowy"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>

      {/* GŁÓWNA OBSZAR: STREAM EKRANU LUB SIATKA UCZESTNIKÓW */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden relative">
        {activeStream ? (
          /* WIDOK AKTYWNEGO STREAMU EKRANU */
          <div className="flex-1 flex flex-col overflow-hidden relative rounded-2xl border border-dark-700/60 bg-black shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={activeStream.isLocal} // Wycisz lokalne echo
              className="w-full h-full object-contain bg-black"
            />

            {/* Nakładka informacyjna o streamerze */}
            <div className="absolute top-3 left-3 bg-dark-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-dark-700 flex items-center space-x-2.5">
              <UserAvatar user={activeStream.user} size="sm" />
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>{activeStream.user?.displayName || activeStream.user?.username}</span>
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">LIVE</span>
                </div>
                <div className="text-[10px] text-dark-300">
                  {activeStream.isLocal ? 'Twój ekran' : 'Ekran znajomego'}
                </div>
              </div>
            </div>

            {/* Wybór streamów jeśli więcej niż 1 osoba udostępnia */}
            {allStreams.length > 1 && (
              <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-dark-900/80 backdrop-blur-md p-1.5 rounded-xl border border-dark-700">
                {allStreams.map(st => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStreamId(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeStream.id === st.id
                        ? 'bg-brand-500 text-white'
                        : 'text-dark-300 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    {st.user?.displayName || st.user?.username}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* BRAK STREAMU: SIATKA KAFLI UCZESTNIKÓW W STYLU DISCORDA */
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl w-full">
              {voiceUsers.map((participant) => {
                const pUser = participant.user || participant;
                const isSpeaking = speakingUsers.has(pUser.id);
                const isCurrent = pUser.id === user?.id;

                return (
                  <div
                    key={pUser.id || pUser.socketId}
                    onClick={() => {
                      if (onOpenUserProfile && pUser.id) {
                        onOpenUserProfile(pUser.id);
                      }
                    }}
                    className={`aspect-video bg-dark-800/90 rounded-2xl p-4 flex flex-col items-center justify-center relative border transition-all shadow-md group cursor-pointer ${
                      isSpeaking
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-[1.02]'
                        : 'border-dark-700 hover:border-brand-500'
                    }`}
                    title="Kliknij, aby otworzyć profil użytkownika"
                  >
                    <UserAvatar
                      user={pUser}
                      size="lg"
                      isSpeaking={isSpeaking}
                      showStatus={false}
                    />
                    
                    <div className="mt-2 text-center truncate max-w-[85%]">
                      <div className="text-xs font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                        {pUser.displayName || pUser.username}
                      </div>
                      <div className="text-[10px] text-dark-400 truncate">
                        {isSpeaking ? '🟢 Mówi...' : (isCurrent && isMuted ? '🔴 Wyciszony' : 'Wyciszony')}
                      </div>
                    </div>

                    {/* Plakietki mikrofonu w rogu */}
                    <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                      {isCurrent && isMuted && (
                        <div className="p-1 bg-red-500/20 text-red-400 rounded-md">
                          <MicOff size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Przycisk zachęcający do udostępnienia ekranu */}
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="text-xs text-dark-400 mb-3 flex items-center space-x-1.5">
                <Sparkles size={14} className="text-brand-500" />
                <span>Chcesz pokazać grę lub pulpit znajomym?</span>
              </div>
              <button
                onClick={startScreenShare}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                <MonitorUp size={16} />
                <span>Rozpocznij udostępnianie ekranu (Stream)</span>
              </button>
            </div>
          </div>
        )}

        {/* DOLNY PASEK MINIATUREK GDY STREAM JEST AKTYWNY */}
        {activeStream && voiceUsers.length > 0 && (
          <div className="h-20 mt-3 flex items-center space-x-2 overflow-x-auto scrollbar-thin">
            {voiceUsers.map((participant) => {
              const pUser = participant.user || participant;
              const isSpeaking = speakingUsers.has(pUser.id);

              return (
                <div
                  key={pUser.id || pUser.socketId}
                  onClick={() => {
                    if (onOpenUserProfile && pUser.id) {
                      onOpenUserProfile(pUser.id);
                    }
                  }}
                  className={`h-full aspect-video bg-dark-800 rounded-xl p-2 flex flex-col items-center justify-center relative border transition-all flex-shrink-0 cursor-pointer hover:border-brand-500 ${
                    isSpeaking ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-dark-700'
                  }`}
                  title="Kliknij, aby otworzyć profil użytkownika"
                >
                  <UserAvatar user={pUser} size="sm" isSpeaking={isSpeaking} showStatus={false} />
                  <span className="text-[10px] text-white truncate max-w-full mt-1 font-semibold">
                    {pUser.displayName || pUser.username}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DOLNY PASEK KONTROLEK AUDIO DLA KANAŁU */}
      <div className="h-14 px-4 bg-dark-900 border-t border-dark-950/60 flex items-center justify-center space-x-3 z-10">
        <button
          onClick={toggleMute}
          className={`p-2.5 rounded-full transition-all active:scale-95 shadow ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/40'
              : 'bg-dark-800 text-white hover:bg-dark-700'
          }`}
          title={isMuted ? 'Włącz mikrofon' : 'Wycisz mikrofon'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          onClick={toggleDeafen}
          className={`p-2.5 rounded-full transition-all active:scale-95 shadow ${
            isDeafened
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/40'
              : 'bg-dark-800 text-white hover:bg-dark-700'
          }`}
          title={isDeafened ? 'Włącz dźwięk' : 'Wyłącz dźwięk'}
        >
          <Headphones size={18} />
        </button>

        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`p-2.5 rounded-full transition-all active:scale-95 shadow ${
            isScreenSharing
              ? 'bg-red-600 text-white hover:bg-red-500 ring-2 ring-red-500/50 animate-pulse'
              : 'bg-dark-800 text-white hover:bg-dark-700'
          }`}
          title={isScreenSharing ? 'Zatrzymaj udostępnianie ekranu' : 'Udostępnij ekran'}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
        </button>

        <button
          onClick={() => leaveVoiceChannel(true)}
          className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          title="Rozłącz się"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};
