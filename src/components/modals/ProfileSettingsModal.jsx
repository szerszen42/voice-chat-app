import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Mic, MicOff, Headphones, Volume2, Check, Sparkles,
  RefreshCw, Smartphone, Download, Sliders, ShieldCheck, SlidersHorizontal,
  VolumeX, Activity, Upload, Image as ImageIcon, Trash2, Palette
} from 'lucide-react';
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
    playTestSound,
    isMicTesting,
    inputVolume,
    outputVolume,
    startMicTest,
    stopMicTest,
    changeInputVolume,
    changeOutputVolume,
    noiseSuppression,
    echoCancellation,
    autoGainControl,
    isAutoSensitivity,
    sensitivityThreshold,
    updateAudioProcessingSettings
  } = useVoice();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'voice' | 'app'
  const [displayName, setDisplayName] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarColor, setAvatarColor] = useState('#5865f2');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [bannerColor, setBannerColor] = useState('#5865f2');
  const [status, setStatus] = useState('online');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const sliderTrackRef = useRef(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setCustomStatus(user.customStatus || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setAvatarColor(user.avatarColor || '#5865f2');
      setAvatarEmoji(user.avatarEmoji || '🎮');
      setBannerColor(user.bannerColor || '#5865f2');
      setStatus(user.status || 'online');
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'voice') {
      refreshAudioDevices(true);
      getLocalAudioStream().catch(() => {});
    }
    return () => {
      stopMicTest();
    };
  }, [isOpen, activeTab]);

  if (!isOpen || !user) return null;

  const emojiOptions = ['🎮', '🚀', '🐱', '🎧', '⚡', '🔥', '🦊', '👾', '🌟', '💎', '🦄', '🏆', '🍕', '🛡️', '🍀', '🎵', '🦁', '💀', '🤖', '👑'];
  const colorOptions = ['#5865f2', '#eb459e', '#23a55a', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22', '#111214', '#e91e63', '#1abc9c'];
  const bannerOptions = ['#5865f2', '#2f3136', '#eb459e', '#23a55a', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22', '#111214', '#e91e63'];

  const statusOptions = [
    { id: 'online', label: 'Dostępny', color: 'bg-emerald-500', desc: 'Widziany jako aktywny' },
    { id: 'idle', label: 'Zaraz wracam', color: 'bg-amber-500', desc: 'Chwilowo niedostępny' },
    { id: 'dnd', label: 'Nie przeszkadzać', color: 'bg-red-500', desc: 'Wycisz powiadomienia' },
    { id: 'offline', label: 'Niewidoczny', color: 'bg-neutral-500', desc: 'Wyświetlaj jako offline' },
  ];

  // Obsługa wgrywania pliku graficznego z dysku
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Plik jest za duży! Wybierz zdjęcie do 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        customStatus: customStatus.trim(),
        bio: bio.trim(),
        avatarUrl,
        avatarColor,
        avatarEmoji,
        bannerColor,
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
    avatarUrl,
    avatarColor,
    avatarEmoji,
    bannerColor,
    status,
    customStatus
  };

  // Obsługa przesuwania suwaka czułości ze zdjęcia (Styl Discord)
  const updateSensitivityFromClientX = (clientX) => {
    if (isAutoSensitivity || !sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const rawPercent = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.round(Math.max(1, Math.min(95, rawPercent)));
    updateAudioProcessingSettings({ sensitivityThreshold: clamped });
  };

  const handleSliderMouseDown = (e) => {
    if (isAutoSensitivity) return;
    updateSensitivityFromClientX(e.clientX);
    const onMouseMove = (moveEvent) => {
      updateSensitivityFromClientX(moveEvent.clientX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSliderTouchStart = (e) => {
    if (isAutoSensitivity || !e.touches[0]) return;
    updateSensitivityFromClientX(e.touches[0].clientX);
    const onTouchMove = (moveEvent) => {
      if (moveEvent.touches[0]) {
        updateSensitivityFromClientX(moveEvent.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
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

              {/* Podgląd karty profilu (Discord Style) */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden shadow-md">
                <div
                  className="h-20 w-full relative transition-colors"
                  style={{ backgroundColor: bannerColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                </div>
                <div className="px-4 pb-4 -mt-8 flex items-end space-x-3.5">
                  <div className="ring-4 ring-dark-900 rounded-full bg-dark-900 p-0.5 shadow-xl">
                    <UserAvatar user={previewUser} size="lg" showStatus={true} />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="text-base font-bold text-white truncate">
                      {displayName || user.username}
                    </div>
                    <div className="text-xs text-dark-400">@{user.username}</div>
                    {customStatus && (
                      <div className="text-xs text-brand-400 mt-0.5 truncate">
                        {customStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sekcja wgrywania własnego zdjęcia profilowego */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center space-x-2">
                    <ImageIcon size={15} className="text-brand-400" />
                    <span>Zdjęcie profilowe (Awatar)</span>
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 cursor-pointer font-semibold"
                    >
                      <Trash2 size={13} />
                      <span>Usuń zdjęcie</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileUpload}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shadow-md cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>Wgraj plik z dysku / telefonu</span>
                  </button>
                  <span className="text-[11px] text-dark-400">
                    JPG, PNG, GIF, WebP (do 8MB)
                  </span>
                </div>
              </div>

              {/* Wybór koloru baneru */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Palette size={14} className="text-brand-400" />
                  <span>Kolor baneru profilu</span>
                </label>
                <div className="flex flex-wrap gap-1.5 bg-dark-900 p-2.5 rounded-lg border border-dark-700">
                  {bannerOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBannerColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        bannerColor === c ? 'scale-115 ring-2 ring-white shadow-lg' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
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

              {/* Personalizacja Awatara domyślnego (Emotka + Kolor) */}
              {!avatarUrl && (
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
              )}

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
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          ) : activeTab === 'voice' ? (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-0.5">Ustawienia głosu i dźwięku</h3>
                  <p className="text-xs text-dark-300">Dostosuj urządzenia, tłumienie hałasu, czułość wejściową oraz odsłuch mikrofonu.</p>
                </div>
                <button
                  onClick={async () => {
                    await getLocalAudioStream(null, true);
                    await refreshAudioDevices(true);
                  }}
                  className="p-2 bg-dark-900 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors flex items-center space-x-1.5 text-xs border border-dark-700 cursor-pointer"
                  title="Wczytaj i odśwież nazwy podłączonych urządzeń"
                >
                  <RefreshCw size={14} />
                  <span>Wykryj urządzenia</span>
                </button>
              </div>

              {/* Informacja o braku uprawnień */}
              {!hasMicPermission && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 text-xs text-amber-300">
                    <Mic className="text-amber-400 flex-shrink-0" size={18} />
                    <span>Przeglądarka potrzebuje zgody na mikrofon, aby wykryć nazwy urządzeń i odblokować odsłuch.</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await getLocalAudioStream(null, true);
                      await refreshAudioDevices(true);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-dark-950 font-bold text-xs rounded-lg whitespace-nowrap transition-all shadow-md active:scale-95 self-start sm:self-auto cursor-pointer"
                  >
                    Zezwól na mikrofon
                  </button>
                </div>
              )}

              {/* Wybór Mikrofonu i Słuchawek + Suwaki Głośności */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. MIKROFON */}
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                      <Mic size={14} className="text-brand-400" />
                      <span>Mikrofon (Urządzenie wejściowe)</span>
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
                  </div>

                  {/* Suwak Głośności Mikrofonu */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">Głośność mikrofonu</span>
                      <span className="font-mono text-brand-400 font-bold text-xs">{inputVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={inputVolume}
                      onChange={(e) => changeInputVolume(e.target.value)}
                      className="w-full accent-brand-500 h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. MÓWCA / SŁUCHAWKI */}
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                      <Headphones size={14} className="text-emerald-400" />
                      <span>Słuchawki / Głośniki (Wyjście)</span>
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
                  </div>

                  {/* Suwak Głośności Słuchawek */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">Głośność słuchawek</span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={playTestSound}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Volume2 size={12} />
                          <span>Dźwięk testowy</span>
                        </button>
                        <span className="font-mono text-emerald-400 font-bold text-xs">{outputVolume}%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={outputVolume}
                      onChange={(e) => changeOutputVolume(e.target.value)}
                      className="w-full accent-emerald-500 h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SEKCJA CZUŁOŚCI WEJŚCIOWEJ (DOKŁADNY STYL DISCORDA ZE ZDJĘCIA) */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <Sliders size={15} className="text-brand-400" />
                      <span>Czułość wejściowa</span>
                    </div>
                    <p className="text-[11px] text-dark-400 mt-0.5 max-w-md">
                      Określa, ile dźwięku VoiceChat przesyła z Twojego mikrofonu. Wyłącz tę funkcję, jeśli aplikacja nie odbiera Twojego głosu.
                    </p>
                  </div>

                  {/* Toggle automatycznej czułości */}
                  <div className="flex items-center space-x-2.5 self-start sm:self-center bg-dark-800/80 px-3 py-1.5 rounded-lg border border-dark-700">
                    <span className="text-xs text-dark-200 font-medium">Automatycznie</span>
                    <button
                      type="button"
                      onClick={() => updateAudioProcessingSettings({ isAutoSensitivity: !isAutoSensitivity })}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAutoSensitivity ? 'bg-brand-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isAutoSensitivity ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Pasek suwaka ze zdjęcia Discorda: lewa część ciemna, prawa szmaragdowa z suwakiem i miernikiem poziomu */}
                <div className="space-y-1.5 pt-1">
                  <div
                    ref={sliderTrackRef}
                    onMouseDown={handleSliderMouseDown}
                    onTouchStart={handleSliderTouchStart}
                    className={`relative h-6 w-full bg-[#1e1f22] rounded-full overflow-hidden border border-dark-700 select-none ${
                      isAutoSensitivity ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {/* Prawa strona (obszar aktywny powyżej progu) - soczysta zieleń Discorda */}
                    <div
                      className="absolute top-0 bottom-0 right-0 bg-[#23a55a]"
                      style={{ left: `${sensitivityThreshold}%` }}
                    />

                    {/* Lewa strona (obszar wyciszony poniżej progu) - ciemne tło */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-[#2b2d31]"
                      style={{ width: `${sensitivityThreshold}%` }}
                    />

                    {/* Wizualizator głośności mikrofonu na żywo */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-75 ${
                        micVolume >= sensitivityThreshold ? 'bg-emerald-300/80' : 'bg-dark-500/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, micVolume))}%` }}
                    />

                    {/* Draggable Thumb / Biały okrągły suwak ze zdjęcia */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-white rounded-full shadow-lg border border-gray-300 pointer-events-none z-20 flex items-center justify-center transition-transform active:scale-125"
                      style={{ left: `${sensitivityThreshold}%` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-dark-900/60" />
                    </div>
                  </div>

                  {/* Skala decybeli i wartości pod suwakiem */}
                  <div className="flex justify-between text-[10px] text-dark-400 font-mono px-1">
                    <span>-100 dB</span>
                    <span className="text-emerald-400 font-bold">
                      {isAutoSensitivity ? 'Tryb automatyczny (Dynamiczny próg)' : `Próg: ${sensitivityThreshold - 100} dB (${sensitivityThreshold}%)`}
                    </span>
                    <span>0 dB</span>
                  </div>
                </div>
              </div>

              {/* SEKCJA PRZETWARZANIA GŁOSU I TŁUMIENIA ZAKŁÓCEŃ */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b border-dark-700/80 pb-3">
                  <SlidersHorizontal size={16} className="text-brand-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Zaawansowane przetwarzanie głosu
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Tłumienie hałasu / zakłóceń (Noise Suppression) */}
                  <div className="flex items-center justify-between p-3 bg-dark-800/80 rounded-xl border border-dark-700/60 hover:border-dark-600 transition-colors">
                    <div className="pr-4">
                      <div className="text-xs font-bold text-white flex items-center space-x-2">
                        <span>Tłumienie zakłóceń (Noise Suppression)</span>
                        {!noiseSuppression ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                            Wyłączone (Brak tłumienia)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-semibold">
                            Włączone
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-dark-400 mt-0.5">
                        Wyłącz tłumienie, jeśli aplikacja za bardzo wycisza Twój głos lub ucina cichsze słowa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateAudioProcessingSettings({ noiseSuppression: !noiseSuppression })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        noiseSuppression ? 'bg-brand-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          noiseSuppression ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Usuwanie echa (Echo Cancellation) */}
                  <div className="flex items-center justify-between p-3 bg-dark-800/80 rounded-xl border border-dark-700/60 hover:border-dark-600 transition-colors">
                    <div className="pr-4">
                      <div className="text-xs font-bold text-white">Usuwanie echa (Echo Cancellation)</div>
                      <p className="text-[11px] text-dark-400 mt-0.5">
                        Eliminuje sprzężenia akustyczne i echo z głośników.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateAudioProcessingSettings({ echoCancellation: !echoCancellation })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        echoCancellation ? 'bg-brand-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          echoCancellation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Automatyczne wzmocnienie (AGC) */}
                  <div className="flex items-center justify-between p-3 bg-dark-800/80 rounded-xl border border-dark-700/60 hover:border-dark-600 transition-colors">
                    <div className="pr-4">
                      <div className="text-xs font-bold text-white">Automatyczna regulacja wzmocnienia mikrofonu (AGC)</div>
                      <p className="text-[11px] text-dark-400 mt-0.5">
                        Wyrównuje poziom głośności Twojego mikrofonu do optymalnego poziomu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateAudioProcessingSettings({ autoGainControl: !autoGainControl })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoGainControl ? 'bg-brand-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoGainControl ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* SEKCJA TESTU MIKROFONU (ODSŁUCH NA ŻYWO) */}
              <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center space-x-2">
                    <Sparkles size={15} className="text-brand-400" />
                    <span>Test mikrofonu (Odsłuch na żywo)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-400">{micVolume}%</span>
                </div>

                <p className="text-[11px] text-dark-300">
                  Kliknij przycisk poniżej i powiedz coś. <b>Usłyszysz swój własny głos w słuchawkach</b>, aby sprawdzić jakość. Na czas testu Twój mikrofon jest <b>wyciszony dla innych osób</b> na kanale i PV.
                </p>

                {/* Przycisk Testu + Pasek Segmentowy */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isMicTesting) {
                        stopMicTest();
                      } else {
                        startMicTest();
                      }
                    }}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
                      isMicTesting
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-600/30'
                        : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/30 active:scale-95'
                    }`}
                  >
                    {isMicTesting ? <MicOff size={15} /> : <Mic size={15} />}
                    <span>{isMicTesting ? 'Zatrzymaj test' : 'Testuj mikrofon'}</span>
                  </button>

                  {/* Pasek segmentowy z pionowych kresek */}
                  <div className="flex-1 flex items-center space-x-1 bg-dark-950/80 p-2 rounded-xl border border-dark-700/80 h-10 overflow-hidden relative">
                    {/* Wskaźnik progu czułości jeśli ręczny */}
                    {!isAutoSensitivity && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 shadow-sm shadow-yellow-400"
                        style={{ left: `${Math.min(100, Math.max(0, sensitivityThreshold))}%` }}
                        title={`Próg aktywacji: ${sensitivityThreshold}%`}
                      />
                    )}

                    {Array.from({ length: 36 }).map((_, idx) => {
                      const threshold = (idx / 36) * 100;
                      const isActive = micVolume >= threshold;
                      const gateThreshold = isAutoSensitivity ? 10 : sensitivityThreshold;
                      const isAboveGate = threshold >= gateThreshold;

                      let activeColor = 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
                      if (!isAboveGate) {
                        activeColor = 'bg-dark-500';
                      } else if (idx >= 24 && idx < 30) {
                        activeColor = 'bg-yellow-400 shadow-sm shadow-yellow-400/50';
                      } else if (idx >= 30) {
                        activeColor = 'bg-red-500 shadow-sm shadow-red-500/50';
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex-1 h-full rounded-[2px] transition-all duration-75 ${
                            isActive ? activeColor : 'bg-dark-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {isMicTesting && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-xs text-emerald-400 font-semibold animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Odsłuch jest aktywny: mówisz do mikrofonu i słyszysz siebie w słuchawkach! (Inni w tym czasie Cię nie słyszą)</span>
                  </div>
                )}
              </div>

              {/* Informacje o technologii */}
              <div className="bg-dark-900/60 border border-dark-700 rounded-xl p-4 text-xs text-dark-300 space-y-1.5">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <Sparkles size={14} className="text-brand-500" />
                  <span>Jakość dźwięku Opus i serwery przekaźnikowe TURN</span>
                </div>
                <p className="text-[11px]">
                  Transmisja wykorzystuje kodek <strong>Opus</strong> z aktywną redukcją echa, automatyczną regulacją wzmocnienia oraz darmowymi serwerami <strong>TURN (OpenRelay)</strong> omijającymi zapory routerów.
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
