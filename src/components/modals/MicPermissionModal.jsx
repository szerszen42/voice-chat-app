import React, { useState, useEffect } from 'react';
import { Mic, Volume2, ShieldCheck, X, AlertCircle, Settings, Chrome, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';

export const MicPermissionModal = ({ isOpen, onClose }) => {
  const { requestMicPermission, hasMicPermission, micPermissionState } = useVoice();
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'android_help'
  const [errorMessage, setErrorMessage] = useState(null);

  const handleGrant = async () => {
    setErrorMessage(null);
    const res = await requestMicPermission();
    if (res?.success) {
      onClose();
    } else {
      if (res?.isDenied || micPermissionState === 'denied') {
        setActiveTab('android_help');
        setErrorMessage('Mikrofon jest zablokowany przez przeglądarkę Chrome lub system Android. Wykonaj poniższe 2 kroki, aby go odblokować.');
      } else {
        setErrorMessage('Nie udało się uruchomić mikrofonu. Upewnij się, że inne aplikacje nie blokują mikrofonu.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 sm:p-6 text-dark-100 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Dekoracyjne poświaty */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Przycisk zamknięcia */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Nagłówek */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 flex-shrink-0">
            <Mic size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Dostęp do Mikrofonu na Telefonie</h3>
            <p className="text-[11px] text-dark-300">Wymagane do rozmów w pokojach głosowych i połączeń PV</p>
          </div>
        </div>

        {/* Zakładki */}
        <div className="flex rounded-xl bg-dark-900/90 p-1 mb-4 border border-dark-700/80">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'request'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            1. Włącz mikrofon
          </button>
          <button
            onClick={() => setActiveTab('android_help')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'android_help'
                ? 'bg-amber-500 text-dark-950 shadow-sm'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            2. Instrukcja Android (Gdy nie pyta)
          </button>
        </div>

        {/* Komunikat o błędzie */}
        {errorMessage && (
          <div className="mb-3 p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start space-x-2 animate-fade-in">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Treść zakładki 1: Szybkie włączenie */}
        {activeTab === 'request' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            <p className="text-xs text-dark-200 leading-relaxed">
              Kliknij poniższy przycisk, aby wywołać systemowe zapytanie o zgodę na używanie mikrofonu.
            </p>

            <div className="space-y-2 bg-dark-800/80 border border-dark-700/60 rounded-xl p-3 text-xs">
              <div className="flex items-center space-x-2.5 text-emerald-400">
                <ShieldCheck size={16} className="flex-shrink-0" />
                <span>Bezpieczne szyfrowanie dźwięku WebRTC</span>
              </div>
              <div className="flex items-center space-x-2.5 text-brand-300">
                <Volume2 size={16} className="flex-shrink-0" />
                <span>Odblokowanie głośnika i odsłuchu uczestników</span>
              </div>
              <div className="flex items-center space-x-2.5 text-amber-300">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>Gdy pojawi się okienko, kliknij: <b>"Podczas korzystania z aplikacji"</b></span>
              </div>
            </div>

            <div className="p-3 bg-dark-800/50 border border-dark-700/40 rounded-xl text-[11px] text-dark-400">
              💡 <b>Nie wyskakuje okienko?</b> Przeglądarka Chrome zapamiętała wcześniejszą blokadę. Przełącz na zakładkę <b>"Instrukcja Android"</b>, aby odblokować mikrofon w 10 sekund.
            </div>
          </div>
        )}

        {/* Treść zakładki 2: Instrukcja odblokowania na telefonie */}
        {activeTab === 'android_help' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs text-dark-200 scrollbar-thin">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs">
              <b>Dlaczego okno nie wyskakuje automatycznie?</b>
              <br />
              W telefonach z systemem Android uprawnienia mikrofonu dla aplikacji zainstalowanych przez Chrome są zablokowane w ustawieniach przeglądarki Chrome lub uprawnieniach samej aplikacji Chrome.
            </div>

            <div className="space-y-3">
              {/* KROK 1 */}
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[11px] font-black">1</span>
                  <Chrome size={15} className="text-brand-400" />
                  <span>Odblokowanie w ustawieniach Chrome:</span>
                </div>
                <ol className="list-decimal list-inside text-dark-300 text-[11px] space-y-1 pl-1">
                  <li>Otwórz aplikację <b>Google Chrome</b> na telefonie.</li>
                  <li>Kliknij <b>3 pionowe kropki</b> w prawym górnym rogu ➔ <b>Ustawienia</b>.</li>
                  <li>Zjedź w dół do <b>Ustawienia witryn</b> ➔ <b>Mikrofon</b>.</li>
                  <li>Jeśli Twoja strona jest w <b>Zablokowane</b> ➔ kliknij ją i wybierz <b>Zezwalaj</b> (lub usuń blokadę).</li>
                </ol>
              </div>

              {/* KROK 2 */}
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-dark-950 flex items-center justify-center text-[11px] font-black">2</span>
                  <Smartphone size={15} className="text-emerald-400" />
                  <span>Uprawnienia aplikacji Chrome w Androidzie:</span>
                </div>
                <ol className="list-decimal list-inside text-dark-300 text-[11px] space-y-1 pl-1">
                  <li>Wejdź w <b>Ustawienia telefonu</b> ➔ <b>Aplikacje</b> ➔ <b>Chrome</b>.</li>
                  <li>Kliknij <b>Uprawnienia</b> ➔ <b>Mikrofon</b>.</li>
                  <li>Ustaw na: <b>Zezwalaj tylko podczas korzystania z aplikacji</b>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Dolny pasek przycisków */}
        <div className="mt-4 pt-3 border-t border-dark-700/80 flex items-center space-x-2.5">
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            Zamknij
          </button>
          
          <button
            onClick={handleGrant}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Sprawdź i Włącz Mikrofon</span>
          </button>
        </div>
      </div>
    </div>
  );
};
