import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  MessageCircle, 
  Phone, 
  Search, 
  Trash2, 
  Clock, 
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useSocket } from '../../context/SocketContext';
import { useVoice } from '../../context/VoiceContext';
import { api } from '../../utils/api';

export const FriendsView = ({
  friends = [],
  incomingRequests = [],
  outgoingRequests = [],
  allUsers = [],
  onSelectDmUser,
  onRefreshFriends,
  onOpenMobileSidebar,
  onOpenUserProfile
}) => {
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'all' | 'pending' | 'add'
  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { userStatuses, socket } = useSocket();
  const { startDirectCall } = useVoice();

  // Filtrowanie znajomych i użytkowników
  const isOnline = (user) => {
    const status = userStatuses[user.id] || user.status || 'offline';
    return status !== 'offline';
  };

  const onlineFriends = friends.filter(f => isOnline(f));
  
  const displayedFriends = (activeTab === 'online' ? onlineFriends : friends).filter(f => {
    const q = searchQuery.toLowerCase();
    const name = (f.displayName || f.username).toLowerCase();
    return name.includes(q) || f.username.toLowerCase().includes(q);
  });

  // Wszyscy pozostali zarejestrowani użytkownicy
  const friendIds = new Set(friends.map(f => f.id));
  const pendingIds = new Set([
    ...incomingRequests.map(r => r.user?.id || r.senderId),
    ...outgoingRequests.map(r => r.user?.id || r.recipientId)
  ]);
  
  const otherUsers = allUsers.filter(u => !friendIds.has(u.id));
  const onlineOtherUsers = otherUsers.filter(u => isOnline(u));

  const displayedOtherUsers = (activeTab === 'online' ? onlineOtherUsers : otherUsers).filter(u => {
    const q = searchQuery.toLowerCase();
    const name = (u.displayName || u.username).toLowerCase();
    return name.includes(q) || u.username.toLowerCase().includes(q);
  });

  const suggestedUsers = allUsers.filter(u => !friendIds.has(u.id) && !pendingIds.has(u.id));

  // Wysłanie zaproszenia do znajomych
  const handleSendRequest = async (usernameToSend = null) => {
    const target = (usernameToSend || friendUsernameInput).trim();
    if (!target) {
      setStatusMessage({ type: 'error', text: 'Wpisz nazwę użytkownika, którego chcesz dodać.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.sendFriendRequest(target);
      if (res.autoAccepted) {
        setStatusMessage({
          type: 'success',
          text: `Dodano do znajomych! Użytkownik ${res.friend?.displayName || target} jest teraz Twoim znajomym.`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Wysłano zaproszenie do użytkownika ${res.targetUser?.displayName || target}!`
        });
        if (socket && res.targetUser) {
          socket.emit('friend-request-notify', {
            targetUserId: res.targetUser.id,
            senderUser: res.request
          });
        }
      }
      setFriendUsernameInput('');
      if (onRefreshFriends) onRefreshFriends();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Nie udało się wysłać zaproszenia.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Akceptacja zaproszenia
  const handleAccept = async (reqItem) => {
    try {
      const res = await api.acceptFriendRequest(reqItem.senderId, reqItem.id);
      if (socket && reqItem.user) {
        socket.emit('friend-accepted-notify', {
          targetUserId: reqItem.user.id,
          user: res.friend
        });
      }
      if (onRefreshFriends) onRefreshFriends();
    } catch (err) {
      console.error('Błąd akceptacji:', err);
    }
  };

  // Odrzucenie / anulowanie zaproszenia
  const handleDeclineOrCancel = async (reqItem) => {
    try {
      await api.declineFriendRequest(reqItem.senderId || reqItem.recipientId, reqItem.id);
      if (onRefreshFriends) onRefreshFriends();
    } catch (err) {
      console.error('Błąd odrzucenia/anulowania:', err);
    }
  };

  // Usunięcie znajomego
  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika ze znajomych?')) return;
    try {
      await api.removeFriend(friendId);
      if (socket) {
        socket.emit('friend-removed-notify', { targetUserId: friendId });
      }
      if (onRefreshFriends) onRefreshFriends();
    } catch (err) {
      console.error('Błąd usuwania znajomego:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-700 h-full overflow-hidden select-none">
      {/* GÓRNY PASEK NAWIGACJI W STYLU DISCORDA */}
      <div className="h-12 border-b border-dark-900/60 px-4 flex items-center justify-between shadow-sm bg-dark-800/60 backdrop-blur-sm">
        <div className="flex items-center space-x-4 overflow-x-auto scrollbar-none">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden p-1.5 text-dark-300 hover:text-white rounded-lg hover:bg-dark-600"
            >
              ☰
            </button>
          )}

          <div className="flex items-center space-x-2 text-dark-100 font-bold text-sm">
            <Users size={20} className="text-dark-300" />
            <span>Znajomi</span>
          </div>

          <div className="h-4 w-[1px] bg-dark-600 hidden sm:block"></div>

          {/* ZAKŁADKI */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'online'
                  ? 'bg-dark-600 text-white'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-600/40'
              }`}
            >
              Dostępni ({onlineFriends.length})
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-dark-600 text-white'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-600/40'
              }`}
            >
              Wszyscy ({friends.length})
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-2.5 py-1 rounded-md transition-colors relative flex items-center space-x-1.5 ${
                activeTab === 'pending'
                  ? 'bg-dark-600 text-white'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-600/40'
              }`}
            >
              <span>Oczekujące</span>
              {incomingRequests.length > 0 && (
                <span className="px-1.5 py-0.2 bg-brand-danger text-white rounded-full text-[10px] font-bold">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('add');
                setStatusMessage(null);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                activeTab === 'add'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              Dodaj znajomego
            </button>
          </div>
        </div>
      </div>

      {/* GŁÓWNA ZAWARTOŚĆ WIDOKU */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
        {/* ZAKŁADKA 1: DODAJ ZNAJOMEGO */}
        {activeTab === 'add' && (
          <div className="max-w-2xl">
            <h2 className="text-base font-bold text-white uppercase tracking-wide mb-1">
              Dodaj znajomego
            </h2>
            <p className="text-xs text-dark-300 mb-4">
              Możesz dodać znajomego, wpisując jego nazwę użytkownika (np. <span className="text-dark-100 font-mono">piotrek</span> lub <span className="text-dark-100 font-mono">kasia</span>).
            </p>

            {/* Formularz wyszukiwania / dodawania */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendRequest();
              }}
              className="relative flex items-center mb-4"
            >
              <input
                type="text"
                placeholder="Wpisz nazwę użytkownika (np. kasia)..."
                value={friendUsernameInput}
                onChange={(e) => setFriendUsernameInput(e.target.value)}
                className="w-full bg-dark-900 border border-dark-900 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all pr-44"
              />
              <button
                type="submit"
                disabled={!friendUsernameInput.trim() || isSubmitting}
                className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all shadow"
              >
                {isSubmitting ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
              </button>
            </form>

            {/* Komunikat o sukcesie / błędzie */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl mb-6 flex items-center space-x-2.5 text-xs animate-fade-in ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/15 border border-red-500/40 text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Sugerowane osoby ze społeczności */}
            {suggestedUsers.length > 0 && (
              <div className="mt-8 border-t border-dark-600/40 pt-6">
                <div className="flex items-center space-x-2 text-xs font-bold text-dark-300 uppercase tracking-wider mb-3">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Inni zarejestrowani użytkownicy</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {suggestedUsers.map((su) => (
                    <div
                      key={su.id}
                      className="p-3 bg-dark-800/80 hover:bg-dark-800 border border-dark-600/30 rounded-xl flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <UserAvatar user={su} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {su.displayName || su.username}
                          </div>
                          <div className="text-xs text-dark-400 truncate">@{su.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(su.username)}
                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow flex-shrink-0 ml-2"
                      >
                        <UserPlus size={14} />
                        <span>Dodaj</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ZAKŁADKA 2: OCZEKUJĄCE ZAPROSZENIA */}
        {activeTab === 'pending' && (
          <div className="max-w-3xl space-y-6">
            {/* PRZYCHODZĄCE */}
            <div>
              <div className="text-xs font-bold text-dark-300 uppercase tracking-wider mb-3">
                Przychodzące zaproszenia — {incomingRequests.length}
              </div>
              {incomingRequests.length === 0 ? (
                <div className="text-xs text-dark-400 py-3 italic">
                  Brak oczekujących zaproszeń od innych użytkowników.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-dark-800/90 border border-dark-600/40 rounded-xl flex items-center justify-between hover:bg-dark-800 transition-all shadow-sm"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <UserAvatar user={req.user} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {req.user?.displayName || req.user?.username}
                          </div>
                          <div className="text-xs text-emerald-400 flex items-center space-x-1">
                            <span>Zaproszenie do znajomych</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                        <button
                          onClick={() => handleAccept(req)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-full transition-all shadow"
                          title="Zaakceptuj zaproszenie"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleDeclineOrCancel(req)}
                          className="p-2 bg-dark-900 hover:bg-red-600 hover:text-white text-dark-300 active:scale-95 rounded-full transition-all shadow"
                          title="Odrzuć zaproszenie"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WYCHODZĄCE */}
            <div className="border-t border-dark-600/30 pt-4">
              <div className="text-xs font-bold text-dark-300 uppercase tracking-wider mb-3">
                Wysłane zaproszenia — {outgoingRequests.length}
              </div>
              {outgoingRequests.length === 0 ? (
                <div className="text-xs text-dark-400 py-3 italic">
                  Brak wysłanych zaproszeń oczekujących na odpowiedź.
                </div>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-dark-800/50 border border-dark-600/20 rounded-xl flex items-center justify-between hover:bg-dark-800/80 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <UserAvatar user={req.user} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {req.user?.displayName || req.user?.username}
                          </div>
                          <div className="text-xs text-dark-400 flex items-center space-x-1">
                            <Clock size={12} />
                            <span>Oczekuje na akceptację</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeclineOrCancel(req)}
                        className="p-2 bg-dark-900 hover:bg-red-600 hover:text-white text-dark-400 active:scale-95 rounded-full transition-all shadow ml-3"
                        title="Anuluj zaproszenie"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ZAKŁADKA 3: DOSTĘPNI / WSZYSCY ZNAJOMI */}
        {(activeTab === 'online' || activeTab === 'all') && (
          <div className="max-w-4xl">
            {/* Pasek wyszukiwania wśród znajomych */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Szukaj znajomego..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
              <Search size={16} className="absolute right-3.5 top-3 text-dark-400" />
            </div>

            <div className="text-xs font-bold text-dark-300 uppercase tracking-wider mb-3">
              {activeTab === 'online' ? `Dostępni znajomi — ${displayedFriends.length}` : `Wszyscy znajomi — ${displayedFriends.length}`}
            </div>

            {/* LISTA ZNAJOMYCH */}
            {displayedFriends.length > 0 && (
              <div className="space-y-1.5 mb-6">
                {displayedFriends.map((f) => {
                  const status = userStatuses[f.id] || f.status || 'offline';
                  return (
                    <div
                      key={f.id}
                      className="p-2.5 bg-dark-800/60 hover:bg-dark-800 border border-dark-600/30 rounded-xl flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          onClick={() => {
                            if (onOpenUserProfile) {
                              onOpenUserProfile(f.id);
                            } else {
                              onSelectDmUser(f);
                            }
                          }}
                          className="cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                          title="Zobacz profil"
                        >
                          <UserAvatar user={f} size="md" statusOverride={status} />
                        </div>
                        <div
                          onClick={() => onSelectDmUser(f)}
                          className="min-w-0 cursor-pointer flex-1"
                        >
                          <div className="text-sm font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                            {f.displayName || f.username}
                          </div>
                          <div className="text-xs text-dark-400 truncate">
                            {f.customStatus || (status === 'online' ? '🟢 Dostępny' : status === 'dnd' ? '🔴 Nie przeszkadzać' : status === 'idle' ? '🟡 Zaraz wracam' : '⚫ Niewidoczny')}
                          </div>
                        </div>
                      </div>

                      {/* Przyciski akcji */}
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                        <button
                          onClick={() => onSelectDmUser(f)}
                          className="p-2 bg-dark-900 hover:bg-brand-500 text-dark-300 hover:text-white rounded-full transition-all shadow"
                          title="Otwórz czat (PV)"
                        >
                          <MessageCircle size={16} />
                        </button>

                        <button
                          onClick={() => startDirectCall(f)}
                          className="p-2 bg-dark-900 hover:bg-emerald-600 text-dark-300 hover:text-white rounded-full transition-all shadow"
                          title="Zadzwoń na PV"
                        >
                          <Phone size={16} />
                        </button>

                        <button
                          onClick={() => handleRemoveFriend(f.id)}
                          className="p-2 bg-dark-900 hover:bg-red-600 text-dark-400 hover:text-white rounded-full transition-all shadow opacity-0 group-hover:opacity-100"
                          title="Usuń ze znajomych"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SEKCJA: INNI UŻYTKOWNICY APLIKACJI (AUTOMATYCZNIE WIDOCZNI BEZ KLIKANIA) */}
            {displayedOtherUsers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-dark-300 uppercase tracking-wider mb-3 mt-4">
                  <Sparkles size={14} className="text-brand-400" />
                  <span>
                    {activeTab === 'online'
                      ? `Dostępni użytkownicy — ${displayedOtherUsers.length}`
                      : `Wszyscy zarejestrowani użytkownicy — ${displayedOtherUsers.length}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {displayedOtherUsers.map((u) => {
                    const status = userStatuses[u.id] || u.status || 'offline';
                    const isPending = pendingIds.has(u.id);

                    return (
                      <div
                        key={u.id}
                        className="p-2.5 bg-dark-800/40 hover:bg-dark-800 border border-dark-600/20 rounded-xl flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            onClick={() => {
                              if (onOpenUserProfile) {
                                onOpenUserProfile(u.id);
                              } else {
                                onSelectDmUser(u);
                              }
                            }}
                            className="cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                            title="Zobacz profil"
                          >
                            <UserAvatar user={u} size="md" statusOverride={status} />
                          </div>
                          <div
                            onClick={() => onSelectDmUser(u)}
                            className="min-w-0 cursor-pointer flex-1"
                          >
                            <div className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
                              {u.displayName || u.username}
                            </div>
                            <div className="text-xs text-dark-400 truncate">
                              {u.customStatus || `@${u.username} • ${status === 'online' ? '🟢 Dostępny' : status === 'dnd' ? '🔴 Nie przeszkadzać' : status === 'idle' ? '🟡 Zaraz wracam' : '⚫ Niewidoczny'}`}
                            </div>
                          </div>
                        </div>

                        {/* Przyciski akcji dla użytkownika */}
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                          <button
                            onClick={() => onSelectDmUser(u)}
                            className="p-2 bg-dark-900 hover:bg-brand-500 text-dark-300 hover:text-white rounded-full transition-all shadow"
                            title="Otwórz czat (PV)"
                          >
                            <MessageCircle size={16} />
                          </button>

                          <button
                            onClick={() => startDirectCall(u)}
                            className="p-2 bg-dark-900 hover:bg-emerald-600 text-dark-300 hover:text-white rounded-full transition-all shadow"
                            title="Zadzwoń na PV"
                          >
                            <Phone size={16} />
                          </button>

                          {!isPending ? (
                            <button
                              onClick={() => handleSendRequest(u.username)}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all shadow"
                              title="Dodaj do znajomych"
                            >
                              <UserPlus size={14} />
                              <span className="hidden sm:inline">Dodaj</span>
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-dark-900 text-dark-400 rounded-lg text-[10px] font-medium">
                              Oczekuje
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {displayedFriends.length === 0 && displayedOtherUsers.length === 0 && (
              <div className="text-center py-16 px-4">
                <Users size={48} className="mx-auto mb-3 text-dark-500 opacity-40" />
                <div className="text-sm font-semibold text-dark-200 mb-1">
                  Brak osób do wyświetlenia
                </div>
                <div className="text-xs text-dark-400 mb-4 max-w-sm mx-auto">
                  Gdy inni użytkownicy zarejestrują się w aplikacji, pojawią się tutaj automatycznie.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
