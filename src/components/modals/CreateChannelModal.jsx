import React, { useState } from 'react';
import { X, Hash, Volume2 } from 'lucide-react';
import { api } from '../../utils/api';

export const CreateChannelModal = ({ isOpen, onClose, serverId, initialType = 'text', onChannelCreated }) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !serverId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Wpisz nazwę kanału.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createChannel(serverId, {
        name: name.trim(),
        type,
        topic: topic.trim()
      });
      onChannelCreated(res.channel);
      onClose();
    } catch (err) {
      setError(err.message || 'Nie udało się utworzyć kanału.');
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

        <h2 className="text-xl font-bold text-white mb-1">Utwórz kanał</h2>
        <p className="text-xs text-dark-300 mb-5">
          Dodaj nowy kanał tekstowy lub głosowy do swojego serwera.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Typ kanału */}
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Typ kanału
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`w-full p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                  type === 'text'
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-dark-700 bg-dark-900 text-dark-300 hover:border-dark-600'
                }`}
              >
                <Hash size={22} className={type === 'text' ? 'text-brand-400' : 'text-dark-400'} />
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold">Tekstowy</div>
                  <div className="text-xs text-dark-400">Pisz wiadomości, wysyłaj emoji i linki</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('voice')}
                className={`w-full p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                  type === 'voice'
                    ? 'border-emerald-500 bg-emerald-500/15 text-white'
                    : 'border-dark-700 bg-dark-900 text-dark-300 hover:border-dark-600'
                }`}
              >
                <Volume2 size={22} className={type === 'voice' ? 'text-emerald-400' : 'text-dark-400'} />
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold">Głosowy</div>
                  <div className="text-xs text-dark-400">Rozmawiaj głosowo w czasie rzeczywistym (WebRTC)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Nazwa kanału */}
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Nazwa kanału *
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'text' ? 'Wpisz nazwę kanału...' : 'Wpisz nazwę pokoju...'}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 pl-8 text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
              <div className="absolute left-2.5 top-2.5 text-dark-400">
                {type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
              </div>
            </div>
          </div>

          {/* Temat kanału (dla tekstowego) */}
          {type === 'text' && (
            <div>
              <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                Temat kanału
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="O czym rozmawiamy na tym kanale..."
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2">
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
              {loading ? 'Tworzenie...' : 'Utwórz kanał'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
