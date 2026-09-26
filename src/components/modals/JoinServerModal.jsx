import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { api } from '../../utils/api';

export const JoinServerModal = ({ isOpen, onClose, onServerJoined }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Wpisz kod zaproszenia.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.joinServerByInvite(inviteCode.trim());
      onServerJoined(res.server);
      onClose();
    } catch (err) {
      setError(err.message || 'Nie udało się dołączyć do serwera. Sprawdź poprawność kodu.');
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
          <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center mx-auto mb-3">
            <KeyRound size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Dołącz do serwera</h2>
          <p className="text-xs text-dark-300 mt-1">
            Wpisz kod zaproszenia otrzymany od znajomego, aby dołączyć do prywatnego serwera.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
              Kod zaproszenia *
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="np. GLOWNA-SPOLECZNOSC lub EKIPA-4A9F"
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-dark-500 font-mono tracking-wider focus:outline-none focus:border-brand-500 uppercase"
              required
            />
            <span className="text-[11px] text-dark-400 mt-1 block">
              Przykładowe kody: <code className="text-brand-400">GLOWNA-SPOLECZNOSC</code>, <code className="text-brand-400">GRACZE-2026</code>
            </span>
          </div>

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
              {loading ? 'Dołączanie...' : 'Dołącz do serwera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
