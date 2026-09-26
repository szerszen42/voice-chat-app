import React, { useState, useEffect } from 'react';
import { X, Hash, Volume2 } from 'lucide-react';

export const EditChannelModal = ({ isOpen, onClose, channel, onSave }) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (channel) {
      // Jeśli kanał głosowy, usuń ewentualny prefiks 🔊 dla czystej edycji
      const cleanName = channel.type === 'voice' && channel.name.startsWith('🔊 ')
        ? channel.name.replace(/^🔊\s*/, '')
        : channel.name;

      setName(cleanName || '');
      setTopic(channel.topic || '');
      setError('');
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nazwa kanału nie może być pusta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(channel.id, {
        name: name.trim(),
        topic: topic.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Nie udało się zapisać zmian.');
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

        <h2 className="text-xl font-bold text-white mb-1">Edytuj kanał</h2>
        <p className="text-xs text-dark-300 mb-5">
          Zmień nazwę lub temat wybranego kanału.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Nazwa kanału..."
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 pl-8 text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
              <div className="absolute left-2.5 top-2.5 text-dark-400">
                {channel.type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
              </div>
            </div>
          </div>

          {/* Temat kanału (dla tekstowego) */}
          {channel.type === 'text' && (
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
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
