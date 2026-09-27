import React from 'react';
import { Mic, Volume2, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';

export const MicPermissionModal = ({ isOpen, onClose }) => {
  const { requestMicPermission, hasMicPermission } = useVoice();

  if (!isOpen) return null;

  const handleGrant = async () => {
    const success = await requestMicPermission();
    if (success) {
      onClose();
    } else {
      alert('Nie udało się uzyskać uprawnień. Kliknij w kłódkę lub ustawienia strony w pasku adresu przeglądarki i wybierz: "Zezwalaj na mikrofon".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-dark-100 relative overflow-hidden">
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <Mic size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Dostęp do Mikrofonu i Dźwięku</h3>
            <p className="text-xs text-dark-300">Wymagane do rozmów na telefonie i komputerze</p>
          </div>
        </div>

        <p className="text-xs text-dark-200 mb-4 leading-relaxed">
          Aby móc swobodnie rozmawiać na kanałach głosowych, słyszeć innych uczestników oraz widzieć wskaźnik mówienia, Twoja przeglądarka musi otrzymać dostęp do mikrofonu i głośnika.
        </p>

        <div className="space-y-2 mb-6 bg-dark-800/80 border border-dark-700/60 rounded-xl p-3 text-xs">
          <div className="flex items-center space-x-2.5 text-emerald-400">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <span>Bezpieczne połączenie szyfrowane (WebRTC)</span>
          </div>
          <div className="flex items-center space-x-2.5 text-brand-300">
            <Volume2 size={16} className="flex-shrink-0" />
            <span>Automatyczne odblokowanie odtwarzania dźwięku</span>
          </div>
          <div className="flex items-center space-x-2.5 text-dark-300">
            <AlertCircle size={16} className="flex-shrink-0 text-amber-400" />
            <span>W oknie przeglądarki kliknij <b>"Zezwalaj"</b></span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            Anuluj
          </button>
          <button
            onClick={handleGrant}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Mic size={16} />
            <span>Zezwól i Włącz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
