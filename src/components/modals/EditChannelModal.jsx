import React, { useState, useEffect } from 'react';
import { X, Hash, Volume2, Lock, Shield, EyeOff, FileText } from 'lucide-react';

export const EditChannelModal = ({ isOpen, onClose, channel, server, onSave }) => {
  const roles = server?.roles || [];

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [hideFromUnauthorized, setHideFromUnauthorized] = useState(false);
  const [allowedRoleIds, setAllowedRoleIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (channel) {
      const cleanName = channel.type === 'voice' && channel.name.startsWith('🔊 ')
        ? channel.name.replace(/^🔊\s*/, '')
        : channel.name;

      setName(cleanName || '');
      setTopic(channel.topic || '');
      setIsPrivate(Boolean(channel.isPrivate));
      setReadOnly(Boolean(channel.readOnly));
      setHideFromUnauthorized(Boolean(channel.hideFromUnauthorized));
      setAllowedRoleIds(Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds : []);
      setError('');
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const toggleRoleSelection = (roleId) => {
    setAllowedRoleIds(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

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
        topic: topic.trim(),
        isPrivate,
        readOnly: channel.type === 'text' ? readOnly : false,
        hideFromUnauthorized,
        allowedRoleIds: isPrivate ? allowedRoleIds : [],
        allowSendRoleIds: readOnly ? allowedRoleIds : [],
        allowConnectRoleIds: isPrivate && channel.type === 'voice' ? allowedRoleIds : []
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
      <div className="bg-dark-800 border border-dark-600 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-dark-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Edytuj kanał</h2>
        <p className="text-xs text-dark-300 mb-5">
          Zmień nazwę, temat lub dostosuj uprawnienia i widoczność kanału.
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

          {/* UPRAWNIENIA KANAŁU */}
          <div className="pt-2 border-t border-dark-700 space-y-3">
            <div className="text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Shield size={14} className="text-amber-400" />
              <span>Uprawnienia i Prywatność kanału</span>
            </div>

            {/* Opcja 1: Kanał prywatny */}
            <div 
              onClick={() => setIsPrivate(!isPrivate)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isPrivate
                  ? 'border-amber-500/60 bg-amber-500/10 text-white'
                  : 'border-dark-700 bg-dark-900/80 text-dark-300 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center space-x-2.5 pr-2">
                <Lock size={18} className={isPrivate ? 'text-amber-400' : 'text-dark-500'} />
                <div>
                  <div className="text-xs font-bold text-white">Kanał prywatny</div>
                  <div className="text-[10px] text-dark-400 mt-0.5">
                    Tylko wybrane role oraz Właściciel/Administratorzy mają dostęp.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={() => {}}
                className="rounded text-amber-500 focus:ring-0 cursor-pointer flex-shrink-0"
              />
            </div>

            {/* Opcja 2: Kanał tylko do odczytu (dla tekstowego) */}
            {channel.type === 'text' && (
              <div 
                onClick={() => setReadOnly(!readOnly)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  readOnly
                    ? 'border-brand-500/60 bg-brand-500/10 text-white'
                    : 'border-dark-700 bg-dark-900/80 text-dark-300 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center space-x-2.5 pr-2">
                  <FileText size={18} className={readOnly ? 'text-brand-400' : 'text-dark-500'} />
                  <div>
                    <div className="text-xs font-bold text-white">Kanał tylko do odczytu (Ogłoszenia)</div>
                    <div className="text-[10px] text-dark-400 mt-0.5">
                      Zwykli użytkownicy mogą tylko czytać wiadomości, a pisać mogą tylko moderatorzy i administratorzy.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={readOnly}
                  onChange={() => {}}
                  className="rounded text-brand-500 focus:ring-0 cursor-pointer flex-shrink-0"
                />
              </div>
            )}

            {/* Opcja 3: Ukryj kanał całkowicie */}
            <div 
              onClick={() => setHideFromUnauthorized(!hideFromUnauthorized)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                hideFromUnauthorized
                  ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                  : 'border-dark-700 bg-dark-900/80 text-dark-300 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center space-x-2.5 pr-2">
                <EyeOff size={18} className={hideFromUnauthorized ? 'text-indigo-400' : 'text-dark-500'} />
                <div>
                  <div className="text-xs font-bold text-white">Ukryj przed osobami bez uprawnień</div>
                  <div className="text-[10px] text-dark-400 mt-0.5">
                    Kanał nie pojawi się na liście dla osób bez odpowiedniej rangi.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hideFromUnauthorized}
                onChange={() => {}}
                className="rounded text-indigo-500 focus:ring-0 cursor-pointer flex-shrink-0"
              />
            </div>

            {/* Lista wyboru ról, jeśli kanał jest prywatny */}
            {isPrivate && roles.length > 0 && (
              <div className="p-3 bg-dark-900 rounded-xl border border-dark-700 space-y-2 animate-fade-in">
                <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider">
                  Wybierz role z dostępem do tego kanału:
                </label>
                <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                  {roles
                    .filter(r => r.id !== 'role-owner')
                    .map(role => {
                      const isChecked = allowedRoleIds.includes(role.id);
                      return (
                        <div
                          key={role.id}
                          onClick={() => toggleRoleSelection(role.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-dark-800 border-brand-500/70 text-white'
                              : 'bg-dark-950/60 border-dark-800 text-dark-300 hover:border-dark-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: role.color || '#99aab5' }} />
                            <span className="text-xs font-semibold truncate">{role.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-brand-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-dark-700">
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
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow"
            >
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
