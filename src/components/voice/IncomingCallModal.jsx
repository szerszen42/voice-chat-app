import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useVoice } from '../../context/VoiceContext';
import { useSocket } from '../../context/SocketContext';

export const IncomingCallModal = () => {
  const { incomingCall } = useSocket();
  const { acceptDirectCall, rejectDirectCall } = useVoice();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Pulsujący awatar */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <UserAvatar user={incomingCall} size="xl" showStatus={false} />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {incomingCall.displayName || incomingCall.username}
        </h3>
        <p className="text-sm text-emerald-400 font-medium mb-6 animate-pulse">
          Dzwoni do Ciebie na PV... 🎙️
        </p>

        {/* Przyciski Odbierz i Odrzuć */}
        <div className="flex items-center space-x-6">
          <button
            onClick={rejectDirectCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
            title="Odrzuć połączenie"
          >
            <PhoneOff size={24} />
          </button>

          <button
            onClick={acceptDirectCall}
            className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all animate-bounce"
            title="Odbierz połączenie"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
