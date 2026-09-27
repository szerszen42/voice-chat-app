import React, { useState } from 'react';
import { X, Globe, Lock, Sparkles } from 'lucide-react';
import { api } from '../../utils/api';

export const CreateServerModal = ({ isOpen, onClose, onServerCreated, onOpenJoinModal }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💬');
  const [color, setColor] = useState('#5865f2');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const emojiOptions = ['💬', '🎮', '🚀', '🎧', '⚡', '🔥', '🛡️', '🕹️', '👑', '🌍', '🐱', '🍕'];
  const colorOptions = ['#5865f2', '#23a55a', '#eb459e', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22', '#111214'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Wpisz nazwę serwera.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createServer({
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        isPublic
      });
      onServerCreated(res.server);
      onClose();
    } catch (err) {
      setError(err.message || 'Nie udało się utworzyć serwera.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-dark-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Stwórz swój serwer</h2>
          <p className="text-xs text-dark-300 mt-1">
            Twoje nowe miejsce spotkań z przyjaciółmi, rozmów głosowych i czatu.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nazwa serwera */}
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Nazwa serwera *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wpisz nazwę serwera..."
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Krótki opis */}
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Opis serwera
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis społeczności..."
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Wybór typu: Publiczny vs Prywatny */}
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Widoczność serwera
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isPublic
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                }`}
              >
                <Globe size={22} className={isPublic ? 'text-brand-500 mb-1' : 'mb-1'} />
                <span className="text-xs font-bold">Publiczny</span>
                <span className="text-[10px] opacity-70">Widoczny w katalogu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  !isPublic
                    ? 'border-amber-500 bg-amber-500/15 text-white'
                    : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                }`}
              >
                <Lock size={22} className={!isPublic ? 'text-amber-400 mb-1' : 'mb-1'} />
                <span className="text-xs font-bold">Prywatny</span>
                <span className="text-[10px] opacity-70">Tylko z kodem zaproszenia</span>
              </button>
            </div>
          </div>

          {/* Ikona i Kolor */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                Ikona
              </label>
              <div className="flex flex-wrap gap-1 bg-dark-900 p-2 rounded-lg border border-dark-700 max-h-24 overflow-y-auto">
                {emojiOptions.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`text-lg p-1 rounded hover:bg-dark-700 transition-colors ${
                      icon === em ? 'bg-dark-600 ring-1 ring-brand-500' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                Kolor tła
              </label>
              <div className="flex flex-wrap gap-1.5 bg-dark-900 p-2 rounded-lg border border-dark-700">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Przyciski */}
          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenJoinModal();
              }}
              className="text-xs text-brand-500 hover:underline"
            >
              Masz już kod zaproszenia?
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-white"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loading ? 'Tworzenie...' : 'Stwórz serwer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
