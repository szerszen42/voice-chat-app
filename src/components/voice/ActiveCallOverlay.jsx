import React from 'react';
import { PhoneOff, Mic, MicOff, Headphones } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useVoice } from '../../context/VoiceContext';

export const ActiveCallOverlay = () => {
  const {
    directCallState,
    directCallPartner,
    callDuration,
    endDirectCall,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen
  } = useVoice();

  if (!directCallState || !directCallPartner) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed top-4 right-4 z-40 bg-dark-900/95 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center space-x-4 animate-fade-in select-none">
      <div className="relative">
        <UserAvatar user={directCallPartner} size="md" showStatus={false} />
        {directCallState === 'connected' && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-dark-900" />
        )}
      </div>

      <div className="min-w-0 pr-2">
        <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{directCallState === 'calling' ? 'Dzwonienie...' : 'Rozmowa PV'}</span>
        </div>
        <div className="text-sm font-bold text-white truncate max-w-[140px]">
          {directCallPartner.displayName || directCallPartner.username}
        </div>
        {directCallState === 'connected' && (
          <div className="text-xs text-dark-300 font-mono">
            {formatDuration(callDuration)}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1.5 pl-2 border-l border-dark-700">
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full transition-colors ${
            isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
          }`}
          title={isMuted ? 'Włącz mikrofon' : 'Wycisz mikrofon'}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          onClick={toggleDeafen}
          className={`p-2 rounded-full transition-colors ${
            isDeafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
          }`}
          title={isDeafened ? 'Włącz dźwięk' : 'Wyłącz dźwięk'}
        >
          <Headphones size={16} />
        </button>

        <button
          onClick={endDirectCall}
          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md transition-transform hover:scale-105"
          title="Zakończ rozmowę"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
};
