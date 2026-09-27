import React, { useState, useEffect } from 'react';
import { X, User, Mic, Headphones, Volume2, Check, Sparkles, RefreshCw, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { useSocket } from '../../context/SocketContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { UserAvatar } from '../common/UserAvatar';

export const ProfileSettingsModal = ({ isOpen, onClose, onOpenInstallPwa }) => {
  const { user, updateProfile } = useAuth();
  const { isStandalone, isInstallable, promptInstall } = usePwaInstall();
  const {
    micVolume,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    hasMicPermission,
    getLocalAudioStream,
    changeAudioInputDevice,
    changeAudioOutputDevice,
    refreshAudioDevices,
    playTestSound
  } = useVoice();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'voice' | 'app'
  const [displayName, setDisplayName] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#5865f2');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [status, setStatus] = useState('online');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setCustomStatus(user.customStatus || '');
      setBio(user.bio || '');
      setAvatarColor(user.avatarColor || '#5865f2');
      setAvatarEmoji(user.avatarEmoji || '🎮');
      setStatus(user.status || 'online');
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'voice') {
      refreshAudioDevices(true);
      getLocalAudioStream().catch(() => {});
    }
  }, [isOpen, activeTab]);

  if (!isOpen || !user) return null;

  const emojiOptions = ['🎮', '🚀', '🐱', '🎧', '⚡', '🔥', '🦊', '👾', '🌟', '💎', '🦄', '🏆', '🍕', '🛡️', '🍀', '🎵'];
  const colorOptions = ['#5865f2', '#eb459e', '#23a55a', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22', '#111214', '#e91e63'];

  const statusOptions = [
    { id: 'online', label: 'Dostępny', color: 'bg-emerald-500', desc: 'Widziany jako aktywny' },
    { id: 'idle', label: 'Zaraz wracam', color: 'bg-amber-500', desc: 'Chwilowo niedostępny' },
    { id: 'dnd', label: 'Nie przeszkadzać', color: 'bg-red-500', desc: 'Wycisz powiadomienia' },
    { id: 'offline', label: 'Niewidoczny', color: 'bg-neutral-500', desc: 'Wyświetlaj jako offline' },
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        customStatus: customStatus.trim(),
        bio: bio.trim(),
        avatarColor,
        avatarEmoji,
        status
      });

      if (socket) {
        socket.emit('set-status', { status });
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Nie udało się zaktualizować profilu.');
    } finally {
      setLoading(false);
    }
  };

  const previewUser = {
    ...user,
    displayName,
    avatarColor,
    avatarEmoji,
    status,
    customStatus
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Lewy pasek zakładek */}
        <div className="w-full md:w-52 bg-dark-900 p-4 border-r border-dark-700/60 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3 px-2">
              Ustawienia
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-dark-700 text-white shadow-sm'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                }`}
              >
                <User size={16} />
                <span>Mój Profil</span>
              </button>

              <button
                onClick={() => setActiveTab('voice')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'voice'
                    ? 'bg-dark-700 text-white shadow-sm'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                }`}
              >
                <Mic size={16} />
                <span>Głos i Dźwięk</span>
              </button>

              <button
                onClick={() => setActiveTab('app')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'app'
                    ? 'bg-dark-700 text-white shadow-sm'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                }`}
              >
                <Smartphone size={16} className="text-brand-400" />
                <span>Aplikacja mobilna</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-dark-400 px-2 pt-4 hidden md:block">
            VoiceChat v1.0.0
          </div>
        </div>

        {/* Główny obszar ustawień */}
        <div className="flex-1 p-6 overflow-y-auto bg-dark-800 relative scrollbar-thin">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {activeTab === 'profile' ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Edycja profilu</h3>
                <p className="text-xs text-dark-300">Dostosuj swój nick, awatar i status widoczny dla znajomych.</p>
              </div>

              {/* Podgląd karty profilu */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex items-center space-x-4 shadow-sm">
                <UserAvatar user={previewUser} size="lg" />
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {displayName || user.username}
                  </div>
                  <div className="text-xs text-dark-400">@{user.username}</div>
                  {customStatus && (
                    <div className="text-xs text-brand-400 mt-1 truncate">
                      {customStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Nazwa wyświetlana */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Nazwa wyświetlana (Nick)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Twoja nazwa..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Status własny */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Własny opis statusu
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="np. Gra w CS2 / Słucha muzyki 🎧"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* O mnie / Bio */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  O mnie (Bio)
                </label>
                <textarea
                  rows="2"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kilka słów o sobie..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Status obecności */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Status obecności
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatus(st.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center space-x-2.5 transition-all ${
                        status === st.id
                          ? 'border-brand-500 bg-brand-500/15 text-white'
                          : 'border-dark-700 bg-dark-900 text-dark-300 hover:border-dark-600'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${st.color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{st.label}</div>
                        <div className="text-[10px] text-dark-400 truncate">{st.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personalizacja Awatara */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    Emotka awatara
                  </label>
                  <div className="flex flex-wrap gap-1 bg-dark-900 p-2 rounded-lg border border-dark-700 max-h-24 overflow-y-auto">
                    {emojiOptions.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setAvatarEmoji(em)}
                        className={`text-lg p-1 rounded hover:bg-dark-700 transition-transform ${
                          avatarEmoji === em ? 'bg-dark-600 ring-1 ring-brand-500 scale-110' : ''
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    Kolor tła awatara
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-dark-900 p-2 rounded-lg border border-dark-700">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAvatarColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          avatarColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Zapisz */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <Check size={14} />
                    <span>Zapisano pomyślnie!</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-brand-500/20"
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          ) : activeTab === 'voice' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Ustawienia głosu i audio</h3>
                  <p className="text-xs text-dark-300">Wybierz mikrofon, słuchawki i sprawdź jakość dźwięku.</p>
                </div>
                <button
                  onClick={async () => {
                    await getLocalAudioStream();
                    await refreshAudioDevices(true);
                  }}
                  className="p-2 bg-dark-900 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors flex items-center space-x-1.5 text-xs border border-dark-700"
                  title="Wczytaj i odśwież nazwy podłączonych urządzeń"
                >
                  <RefreshCw size={14} />
                  <span>Wykryj urządzenia</span>
                </button>
              </div>

              {/* Informacja o uprawnieniach mikrofonu */}
              {!hasMicPermission && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 text-xs text-amber-300">
                    <Mic className="text-amber-400 flex-shrink-0" size={18} />
                    <span>Przeglądarka potrzebuje zgody na mikrofon, aby wykryć nazwy Twoich urządzeń i odblokować dźwięk.</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await getLocalAudioStream();
                      await refreshAudioDevices(true);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-dark-950 font-bold text-xs rounded-lg whitespace-nowrap transition-all shadow-md active:scale-95 self-start sm:self-auto"
                  >
                    Zezwól na mikrofon
                  </button>
                </div>
              )}

              {/* Wybór Mikrofonu i Słuchawek */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Urządzenie Wejściowe (Mikrofon) */}
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center space-x-1.5 text-brand-400">
                    <Mic size={16} />
                    <span>Urządzenie wejściowe (Mikrofon)</span>
                  </label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => changeAudioInputDevice(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="default">Domyślny mikrofon systemu</option>
                    {audioInputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Mikrofon ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-dark-400 block">
                    Możesz go również szybko zmienić, klikając <b>prawym przyciskiem myszy</b> na ikonę mikrofonu na dolnym pasku.
                  </span>
                </div>

                {/* 2. Urządzenie Wyjściowe (Słuchawki / Głośniki) */}
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center space-x-1.5 text-emerald-400">
                    <Headphones size={16} />
                    <span>Urządzenie wyjściowe (Słuchawki)</span>
                  </label>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => changeAudioOutputDevice(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="default">Domyślne słuchawki / głośniki</option>
                    {audioOutputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Głośnik / Słuchawki ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={playTestSound}
                    className="w-full py-1.5 bg-dark-700 hover:bg-dark-600 text-emerald-400 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors border border-dark-600"
                  >
                    <Volume2 size={14} />
                    <span>Odtwórz dźwięk testowy</span>
                  </button>
                </div>
              </div>

              {/* Wizualny test poziomu mikrofonu */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center space-x-2">
                    <Mic size={16} className="text-emerald-400" />
                    <span>Wskaźnik czułości mikrofonu (Test na żywo)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await getLocalAudioStream();
                        await refreshAudioDevices(true);
                      }}
                      className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold rounded border border-dark-600 transition-colors"
                    >
                      Przetestuj teraz
                    </button>
                    <span className="text-xs font-mono text-emerald-400 font-bold min-w-[32px] text-right">{micVolume}%</span>
                  </div>
                </div>

                {/* Pasek natężenia dźwięku */}
                <div className="w-full h-4 bg-dark-700 rounded-full overflow-hidden p-0.5 border border-dark-600">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(4, micVolume)}%` }}
                  />
                </div>

                <p className="text-[11px] text-dark-400">
                  Mów do mikrofonu — zielono-żółty pasek rośnie w rytm Twojego głosu. Jeśli się nie rusza, kliknij przycisk <b>"Przetestuj teraz"</b> lub <b>"Zezwól na mikrofon"</b> powyżej.
                </p>
              </div>

              {/* Informacje o technologii */}
              <div className="bg-dark-900/60 border border-dark-700 rounded-xl p-4 text-xs text-dark-300 space-y-2">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <Sparkles size={16} className="text-brand-500" />
                  <span>Jakość dźwięku i WebRTC</span>
                </div>
                <p>
                  Transmisja wykorzystuje kodek <strong>Opus</strong> z aktywną redukcją echa (Echo Cancellation), automatyczną regulacją wzmocnienia (AGC) i tłumieniem hałasu tła (Noise Suppression).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Aplikacja na telefon (PWA)</h3>
                <p className="text-xs text-dark-300">Zainstaluj VoiceChat na swoim smartfonie i korzystaj jak z natywnej aplikacji.</p>
              </div>

              <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-2xl shadow-lg">
                    🎙️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">VoiceChat & Community Mobile</h4>
                    <p className="text-xs text-dark-400">Tryb pełnoekranowy, gesty swipe, brak pasków przeglądarki</p>
                  </div>
                </div>

                {isStandalone ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-semibold flex items-center space-x-2">
                    <Check size={16} />
                    <span>Aplikacja jest już zainstalowana i aktywna w trybie aplikacji!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenInstallPwa) {
                        onOpenInstallPwa();
                      } else if (isInstallable) {
                        promptInstall();
                      }
                    }}
                    className="w-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/30 transition-all text-xs"
                  >
                    <Download size={16} />
                    <span>Zainstaluj aplikację na telefonie</span>
                  </button>
                )}
              </div>

              {/* Instrukcja gestów swipe */}
              <div className="bg-dark-900/60 border border-dark-700 rounded-xl p-4 text-xs text-dark-300 space-y-3">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <span>📱</span>
                  <span>Gesty dotykowe na telefonie (Swipe):</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start space-x-2">
                    <span className="text-brand-400 font-bold">👉 Przesuń w prawo:</span>
                    <span>Otwiera listę serwerów i kanałów tekstowych/głosowych oraz rozmów prywatnych.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-brand-400 font-bold">👈 Przesuń w lewo:</span>
                    <span>Wraca do czatu lub otwiera listę członków serwera.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
