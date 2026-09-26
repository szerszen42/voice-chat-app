import React, { useState, useEffect } from 'react';
import { X, Search, Globe, Users, Hash, Check } from 'lucide-react';
import { api } from '../../utils/api';

export const ExploreServersModal = ({ isOpen, onClose, onServerJoined, currentServerIds = [] }) => {
  const [publicServers, setPublicServers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPublicServers();
    }
  }, [isOpen]);

  const loadPublicServers = async () => {
    setLoading(true);
    try {
      const res = await api.getExploreServers();
      setPublicServers(res.servers || []);
    } catch (err) {
      console.error('Błąd wczytywania serwerów publicznych:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (server) => {
    setJoiningId(server.id);
    try {
      const res = await api.joinPublicServer(server.id);
      onServerJoined(res.server);
      onClose();
    } catch (err) {
      alert(err.message || 'Nie udało się dołączyć do serwera.');
    } finally {
      setJoiningId(null);
    }
  };

  if (!isOpen) return null;

  const filteredServers = publicServers.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative text-dark-100 flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Nagłówek */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-brand-500 mb-1">
            <Globe size={22} />
            <span className="text-xs font-bold uppercase tracking-wider">Katalog Społeczności</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Odkrywaj serwery publiczne</h2>
          <p className="text-xs text-dark-300 mt-0.5">
            Dołącz do otwartych serwerów, poznaj nowych graczy i rozmawiaj na kanałach głosowych.
          </p>
        </div>

        {/* Pasek wyszukiwania */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Szukaj serwerów publicznych po nazwie lub opisie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
          />
          <Search size={18} className="absolute left-3 top-3 text-dark-400" />
        </div>

        {/* Lista serwerów */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {loading ? (
            <div className="text-center py-12 text-sm text-dark-400">
              Wczytywanie serwerów...
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-12 text-sm text-dark-400">
              Nie znaleziono serwerów publicznych pasujących do zapytania.
            </div>
          ) : (
            filteredServers.map((server) => {
              const isAlreadyMember = currentServerIds.includes(server.id) || server.isMember;
              return (
                <div
                  key={server.id}
                  className="bg-dark-900/80 border border-dark-700/70 rounded-xl p-4 flex items-center justify-between hover:border-dark-600 transition-all hover:bg-dark-900"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: server.color || '#5865f2' }}
                    >
                      {server.icon || server.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 pr-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white truncate">{server.name}</h4>
                        <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-semibold uppercase">
                          Publiczny
                        </span>
                      </div>
                      <p className="text-xs text-dark-300 truncate mt-0.5">
                        {server.description || 'Brak opisu społeczności.'}
                      </p>
                      <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-dark-400">
                        <span className="flex items-center space-x-1">
                          <Users size={12} />
                          <span>{server.memberCount} członków</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Hash size={12} />
                          <span>{server.channelCount} kanałów</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isAlreadyMember ? (
                      <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                        <Check size={14} />
                        <span>Dołączono</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoin(server)}
                        disabled={joiningId === server.id}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-brand-500/30 transition-all disabled:opacity-50"
                      >
                        {joiningId === server.id ? 'Dołączanie...' : 'Dołącz do serwera'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
