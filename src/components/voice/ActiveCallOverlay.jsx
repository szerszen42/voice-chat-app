import React, { useState, useRef, useEffect } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Headphones, 
  MonitorUp, 
  MonitorOff, 
  Maximize2, 
  Minimize2, 
  Tv, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useVoice } from '../../context/VoiceContext';
import { useAuth } from '../../context/AuthContext';

export const ActiveCallOverlay = () => {
  const { user } = useAuth();
  const {
    directCallState,
    directCallPartner,
    callDuration,
    endDirectCall,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    isScreenSharing,
    localScreenStream,
    directRemoteScreenStream,
    startScreenShare,
    stopScreenShare
  } = useVoice();

  const [isMinimizedStream, setIsMinimizedStream] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const activeStream = directRemoteScreenStream || (isScreenSharing ? localScreenStream : null);
  const isViewingRemote = !!directRemoteScreenStream;

  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => console.warn('Video play error:', e));
      };
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [activeStream]);

  if (!directCallState || !directCallPartner) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  return (
    <>
      {/* GŁÓWNY PŁYWAJĄCY PASEK ROZMOWY PV */}
      <div className="fixed top-4 right-4 z-40 bg-dark-900/95 border border-emerald-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center space-x-3.5 animate-fade-in select-none">
        <div className="relative">
          <UserAvatar user={directCallPartner} size="md" showStatus={false} />
          {directCallState === 'connected' && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-dark-900" />
          )}
        </div>

        <div className="min-w-0 pr-1">
          <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{directCallState === 'calling' ? 'Dzwonienie...' : 'Rozmowa PV'}</span>
          </div>
          <div className="text-sm font-bold text-white truncate max-w-[130px]">
            {directCallPartner.displayName || directCallPartner.username}
          </div>
          {directCallState === 'connected' && (
            <div className="text-xs text-dark-300 font-mono">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* PRZYCISKI KONTROLNE ROZMOWY */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-dark-700/80">
          {/* MIKROFON */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-dark-800 text-dark-200 hover:bg-dark-700'
            }`}
            title={isMuted ? 'Włącz mikrofon' : 'Wycisz mikrofon'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* DŹWIĘK / SŁUCHAWKI */}
          <button
            onClick={toggleDeafen}
            className={`p-2 rounded-full transition-colors ${
              isDeafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-dark-800 text-dark-200 hover:bg-dark-700'
            }`}
            title={isDeafened ? 'Włącz dźwięk' : 'Wyłącz dźwięk'}
          >
            <Headphones size={16} />
          </button>

          {/* UDOSTĘPNIANIE EKRANU W PV (STREAM) */}
          {directCallState === 'connected' && (
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-2 rounded-full transition-colors ${
                isScreenSharing
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600'
                  : 'bg-dark-800 text-dark-200 hover:bg-dark-700 hover:text-emerald-400'
              }`}
              title={isScreenSharing ? 'Zatrzymaj streamowanie' : 'Udostępnij ekran (Stream PV)'}
            >
              {isScreenSharing ? <MonitorOff size={16} /> : <MonitorUp size={16} />}
            </button>
          )}

          {/* ROZŁĄCZ */}
          <button
            onClick={endDirectCall}
            className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md transition-transform hover:scale-105"
            title="Zakończ rozmowę"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>

      {/* OKNO STREAMU W ROZMOWIE PV (JEŚLI KTOŚ UDOSTĘPNIA EKRAN) */}
      {activeStream && (
        <div
          ref={videoContainerRef}
          className={`fixed z-30 transition-all duration-300 shadow-2xl border border-dark-700/80 rounded-2xl overflow-hidden bg-black/95 ${
            isMinimizedStream
              ? 'bottom-4 right-4 w-72 h-44'
              : 'top-24 right-4 w-[480px] max-w-[92vw] h-[300px] max-h-[50vh]'
          }`}
        >
          {/* Górna belka streamu */}
          <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>LIVE</span>
              </span>
              <span className="text-xs font-semibold text-white drop-shadow truncate max-w-[180px]">
                {isViewingRemote ? (directCallPartner.displayName || directCallPartner.username) : 'Twój ekran'}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimizedStream(!isMinimizedStream)}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
                title={isMinimizedStream ? 'Rozwiń podgląd' : 'Zminimalizuj'}
              >
                {isMinimizedStream ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
                title="Pełny ekran"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>

          {/* Odtwarzacz Wideo Streamu */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!isViewingRemote}
            className="w-full h-full object-contain bg-black"
          />
        </div>
      )}
    </>
  );
};
