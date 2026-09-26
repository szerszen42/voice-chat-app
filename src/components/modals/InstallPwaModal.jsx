import React from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const InstallPwaModal = ({ isOpen, onClose }) => {
  const { isInstallable, isStandalone, isIos, promptInstall } = usePwaInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md p-6 text-dark-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-5">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-brand-500/30 mb-3">
            🎙️
          </div>
          <h2 className="text-xl font-bold text-white">Zainstaluj VoiceChat na telefonie</h2>
          <p className="text-xs text-dark-400 mt-1">
            Korzystaj z aplikacji na pełnym ekranie z własną ikoną, dokładnie jak z Discorda czy TikToka!
          </p>
        </div>

        {isStandalone ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center text-emerald-400 text-sm flex flex-col items-center space-y-2">
            <CheckCircle2 size={28} />
            <span className="font-semibold">Aplikacja jest już zainstalowana na Twoim urządzeniu!</span>
          </div>
        ) : isInstallable ? (
          <div className="space-y-4">
            <div className="bg-dark-700/60 p-4 rounded-xl text-xs text-dark-300 space-y-2">
              <div className="flex items-center space-x-2 text-white font-medium">
                <Smartphone size={16} className="text-brand-500" />
                <span>Instalacja w 1 kliknięcie (Android):</span>
              </div>
              <p>Kliknij poniższy przycisk, a system Android doda oficjalną aplikację do Twojego menu i pulpitu.</p>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/30 transition-all active:scale-95"
            >
              <Download size={18} />
              <span>Zainstaluj aplikację teraz</span>
            </button>
          </div>
        ) : isIos ? (
          <div className="space-y-3 text-xs text-dark-300">
            <div className="bg-dark-700/60 p-4 rounded-xl space-y-3 border border-dark-600">
              <div className="font-semibold text-white text-sm flex items-center space-x-2">
                <Share2 size={16} className="text-brand-500" />
                <span>Instrukcja dla iPhone (Safari):</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Dotknij przycisku <strong>Udostępnij</strong> (kwadrat ze strzałką w górę ⬆️) na dole ekranu w Safari.</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Przewiń listę i wybierz <strong>„Do ekranu początkowego”</strong> (Add to Home Screen).</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Kliknij <strong>„Dodaj”</strong> w prawym górnym rogu.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-dark-300">
            <div className="bg-dark-700/60 p-4 rounded-xl space-y-2 border border-dark-600">
              <div className="font-semibold text-white text-sm">Instrukcja instalacji w przeglądarce:</div>
              <p>1. Kliknij <strong>3 pionowe kropki</strong> w prawym górnym rogu przeglądarki Chrome.</p>
              <p>2. Wybierz opcję <strong>„Zainstaluj aplikację”</strong> lub <strong>„Dodaj do ekranu głównego”</strong>.</p>
              <p>3. Zaakceptuj instalację.</p>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-dark-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
