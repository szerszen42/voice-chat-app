import React, { useState, useEffect } from 'react';
import {
  X, MessageSquare, Phone, UserPlus, UserCheck, UserX, Clock,
  Server, Users, Shield, Calendar, Sparkles, Hash, ExternalLink
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { UserAvatar } from '../common/UserAvatar';

export const UserProfileModal = ({
  userId,
  isOpen,
  onClose,
  onStartDm,
  onStartCall,
  onSelectServer
}) => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'servers' | 'friends'
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
    } else {
      setProfileData(null);
      setActiveTab('about');
      setError(null);
    }
  }, [isOpen, userId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUserProfile(userId);
      setProfileData(res);
    } catch (err) {
      console.error('Błąd pobierania profilu:', err);
      setError('Nie udało się wczytać profilu użytkownika.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const targetUser = profileData?.user;
  const mutualServers = profileData?.mutualServers || [];
  const mutualFriends = profileData?.mutualFriends || [];
  const relation = profileData?.friendshipRelation || 'none';
  const isMe = currentUser?.id === userId;

  const bannerColor = targetUser?.bannerColor || targetUser?.avatarColor || '#5865f2';

  const handleAddFriend = async () => {
    if (!targetUser?.username) return;
    setActionLoading(true);
    try {
      await api.sendFriendRequest(targetUser.username);
      if (socket) {
        socket.emit('friend-request-sent', { targetUsername: targetUser.username });
      }
      await loadProfile();
    } catch (err) {
      alert(err.message || 'Błąd wysyłania zaproszenia');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ${targetUser.displayName || targetUser.username} ze znajomych?`)) return;
    setActionLoading(true);
    try {
      await api.removeFriend(targetUser.id);
      await loadProfile();
    } catch (err) {
      alert(err.message || 'Błąd usuwania znajomego');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    setActionLoading(true);
    try {
      await api.acceptFriendRequest(targetUser.id);
      await loadProfile();
    } catch (err) {
      alert(err.message || 'Błąd akceptacji zaproszenia');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in relative">
        
        {/* Przycisk Zamknięcia */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors shadow-md"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-dark-300 font-semibold">Wczytywanie profilu...</span>
          </div>
        ) : error || !targetUser ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-red-400 font-semibold">{error || 'Nie znaleziono profilu.'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-xs font-semibold"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-y-auto scrollbar-thin">
            {/* 1. Baner profilu */}
            <div
              className="h-28 w-full relative transition-colors"
              style={{ backgroundColor: bannerColor }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>

            {/* 2. Nagłówek profilu z Awatarem i Akcjami */}
            <div className="px-5 pb-4 relative bg-dark-800">
              {/* Awatar wystający poza baner */}
              <div className="flex items-end justify-between -mt-12 mb-3">
                <div className="ring-4 ring-dark-800 rounded-full bg-dark-800 p-0.5 shadow-xl">
                  <UserAvatar user={targetUser} size="xl" showStatus={true} />
                </div>

                {/* Przyciski szybkich akcji */}
                <div className="flex items-center space-x-2 pt-2">
                  {!isMe && (
                    <>
                      {onStartDm && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartDm(targetUser);
                          }}
                          className="p-2.5 bg-dark-700 hover:bg-brand-500 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
                          title="Wyślij wiadomość"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}

                      {onStartCall && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartCall(targetUser);
                          }}
                          className="p-2.5 bg-dark-700 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
                          title="Zadzwoń"
                        >
                          <Phone size={16} />
                        </button>
                      )}

                      {relation === 'none' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleAddFriend}
                          className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <UserPlus size={14} />
                          <span>Dodaj</span>
                        </button>
                      )}

                      {relation === 'friends' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleRemoveFriend}
                          className="p-2.5 bg-emerald-500/20 hover:bg-red-500/20 text-emerald-400 hover:text-red-400 border border-emerald-500/40 hover:border-red-500/40 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
                          title="Znajomy (Kliknij, aby usunąć)"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}

                      {relation === 'pending_incoming' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleAcceptFriend}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <UserCheck size={14} />
                          <span>Akceptuj</span>
                        </button>
                      )}

                      {relation === 'pending_outgoing' && (
                        <div className="px-3 py-2 bg-dark-700 text-dark-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5">
                          <Clock size={14} />
                          <span>Wysłano</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Informacje o użytkowniku */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {targetUser.displayName || targetUser.username}
                  </h3>
                  {isMe && (
                    <span className="text-[10px] bg-brand-500/20 text-brand-400 font-bold px-1.5 py-0.5 rounded">
                      TY
                    </span>
                  )}
                </div>
                <div className="text-xs text-dark-400 font-mono">@{targetUser.username}</div>

                {targetUser.customStatus && (
                  <div className="text-xs text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg p-2 mt-2 font-medium">
                    {targetUser.customStatus}
                  </div>
                )}
              </div>

              {/* Zakładki profilu */}
              <div className="flex items-center space-x-1 border-b border-dark-700 mt-4 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('about')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'about'
                      ? 'bg-dark-700 text-white shadow-sm'
                      : 'text-dark-400 hover:text-white hover:bg-dark-750'
                  }`}
                >
                  O mnie
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('servers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'servers'
                      ? 'bg-dark-700 text-white shadow-sm'
                      : 'text-dark-400 hover:text-white hover:bg-dark-750'
                  }`}
                >
                  <Server size={13} />
                  <span>Wspólne serwery</span>
                  <span className="text-[10px] bg-dark-900 px-1.5 py-0.2 rounded-full text-dark-300">
                    {mutualServers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'friends'
                      ? 'bg-dark-700 text-white shadow-sm'
                      : 'text-dark-400 hover:text-white hover:bg-dark-750'
                  }`}
                >
                  <Users size={13} />
                  <span>Wspólni znajomi</span>
                  <span className="text-[10px] bg-dark-900 px-1.5 py-0.2 rounded-full text-dark-300">
                    {mutualFriends.length}
                  </span>
                </button>
              </div>

              {/* Zawartość zakładek */}
              <div className="pt-3">
                {activeTab === 'about' && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    {/* Bio / Opis */}
                    <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                        O mnie
                      </div>
                      <p className="text-dark-200 whitespace-pre-wrap leading-relaxed">
                        {targetUser.bio || 'Ten użytkownik nie dodał jeszcze opisu.'}
                      </p>
                    </div>

                    {/* Data rejestracji / Członkostwo */}
                    <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-dark-300">
                        <Calendar size={14} className="text-brand-400" />
                        <span className="text-[11px] font-semibold">Data dołączenia</span>
                      </div>
                      <span className="text-dark-400 font-mono text-[11px]">
                        {targetUser.createdAt
                          ? new Date(targetUser.createdAt).toLocaleDateString('pl-PL')
                          : 'Użytkownik VoiceChat'}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'servers' && (
                  <div className="space-y-2 animate-fade-in max-h-60 overflow-y-auto scrollbar-thin">
                    {mutualServers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-dark-400 bg-dark-900 rounded-xl border border-dark-700">
                        Nie jesteście razem na żadnym serwerze.
                      </div>
                    ) : (
                      mutualServers.map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => {
                            if (onSelectServer) {
                              onClose();
                              onSelectServer(srv.id);
                            }
                          }}
                          className="flex items-center justify-between p-2.5 bg-dark-900 hover:bg-dark-700 border border-dark-700 rounded-xl cursor-pointer transition-all group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                              {srv.icon ? (
                                <span>{srv.icon}</span>
                              ) : (
                                <span>{srv.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate group-hover:text-brand-400 transition-colors">
                                {srv.name}
                              </div>
                              <div className="text-[10px] text-dark-400">
                                {srv.membersCount} członków
                              </div>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-dark-400 group-hover:text-white transition-colors flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'friends' && (
                  <div className="space-y-2 animate-fade-in max-h-60 overflow-y-auto scrollbar-thin">
                    {mutualFriends.length === 0 ? (
                      <div className="p-6 text-center text-xs text-dark-400 bg-dark-900 rounded-xl border border-dark-700">
                        Brak wspólnych znajomych.
                      </div>
                    ) : (
                      mutualFriends.map((fr) => (
                        <div
                          key={fr.id}
                          className="flex items-center justify-between p-2.5 bg-dark-900 border border-dark-700 rounded-xl"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <UserAvatar user={fr} size="sm" showStatus={true} />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">
                                {fr.displayName || fr.username}
                              </div>
                              <div className="text-[10px] text-dark-400">@{fr.username}</div>
                            </div>
                          </div>
                          {onStartDm && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onStartDm(fr);
                              }}
                              className="p-1.5 bg-dark-800 hover:bg-brand-500 text-dark-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Napisz wiadomość"
                            >
                              <MessageSquare size={13} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
