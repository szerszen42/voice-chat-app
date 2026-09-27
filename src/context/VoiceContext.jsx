import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { playJoinSound, playLeaveSound, playMuteSound, startRingtone, stopRingtone } from '../utils/sounds';

const VoiceContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

export const VoiceProvider = ({ children }) => {
  const { socket, incomingCall, setIncomingCall } = useSocket();
  const { user } = useAuth();

  // Stan aktywnego kanału głosowego (na serwerze)
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null); // { channelId, channelName, serverId }
  const [voiceUsers, setVoiceUsers] = useState([]); // Lista uczestników w kanale
  const [speakingUsers, setSpeakingUsers] = useState(new Set()); // Zbiór userId którzy aktualnie mówią

  // Stan połączenia bezpośredniego 1-na-1 (PV)
  const [directCallState, setDirectCallState] = useState(null); // null | 'calling' | 'connected'
  const [directCallPartner, setDirectCallPartner] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // Kontrolki audio
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // Udostępnianie ekranu (Screen Sharing / Stream)
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map()); // socketId -> { user, stream }
  const [directRemoteScreenStream, setDirectRemoteScreenStream] = useState(null); // stream ekranu partnera w rozmowie PV

  // Urządzenia Audio (Wejścia i Wyjścia)
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState(() => localStorage.getItem('voicechat_audio_input') || 'default');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState(() => localStorage.getItem('voicechat_audio_output') || 'default');
  const [hasMicPermission, setHasMicPermission] = useState(false);

  // Ustawienia przetwarzania dźwięku i bramki szumów
  const [noiseSuppression, setNoiseSuppression] = useState(() => {
    const val = localStorage.getItem('voicechat_noise_suppression');
    return val !== null ? val === 'true' : false; // domyślnie wyłączone, aby mikrofon nie był stłumiony/obcięty
  });
  const [echoCancellation, setEchoCancellation] = useState(() => {
    const val = localStorage.getItem('voicechat_echo_cancellation');
    return val !== null ? val === 'true' : true;
  });
  const [autoGainControl, setAutoGainControl] = useState(() => {
    const val = localStorage.getItem('voicechat_auto_gain');
    return val !== null ? val === 'true' : true;
  });
  const [isAutoSensitivity, setIsAutoSensitivity] = useState(() => {
    const val = localStorage.getItem('voicechat_auto_sens');
    return val !== null ? val === 'true' : true;
  });
  const [sensitivityThreshold, setSensitivityThreshold] = useState(() => {
    const val = localStorage.getItem('voicechat_sens_threshold');
    return val !== null ? Number(val) : 15;
  });

  // Test Mikrofonu (Odsłuch własnego głosu) i Poziomy Głośności
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [inputVolume, setInputVolume] = useState(() => Number(localStorage.getItem('voicechat_input_vol')) || 100);
  const [outputVolume, setOutputVolume] = useState(() => Number(localStorage.getItem('voicechat_output_vol')) || 100);

  // Referencje WebRTC i Audio
  const localStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map()); // socketId -> HTMLAudioElement
  const loopbackAudioElementRef = useRef(null); // odsłuch samego siebie podczas testu
  const loopbackGainNodeRef = useRef(null);
  const loopbackAudioCtxRef = useRef(null);
  const loopbackSourceRef = useRef(null);
  const pendingCandidatesRef = useRef(new Map()); // socketId -> Array<RTCIceCandidateInit>
  const directPeerRef = useRef(null);
  const directAudioRef = useRef(null);
  const directPendingCandidatesRef = useRef([]);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Synchronizacja referencji dla analizatora i pętli audio
  const noiseSuppressionRef = useRef(noiseSuppression);
  const echoCancellationRef = useRef(echoCancellation);
  const autoGainControlRef = useRef(autoGainControl);
  const isAutoSensitivityRef = useRef(isAutoSensitivity);
  const sensitivityThresholdRef = useRef(sensitivityThreshold);
  const isMutedRef = useRef(isMuted);
  const activeVoiceChannelRef = useRef(activeVoiceChannel);
  const socketRef = useRef(socket);
  const userRef = useRef(user);
  const isMicTestingRef = useRef(isMicTesting);
  const inputVolumeRef = useRef(inputVolume);
  const outputVolumeRef = useRef(outputVolume);

  useEffect(() => { noiseSuppressionRef.current = noiseSuppression; }, [noiseSuppression]);
  useEffect(() => { echoCancellationRef.current = echoCancellation; }, [echoCancellation]);
  useEffect(() => { autoGainControlRef.current = autoGainControl; }, [autoGainControl]);
  useEffect(() => { isAutoSensitivityRef.current = isAutoSensitivity; }, [isAutoSensitivity]);
  useEffect(() => { sensitivityThresholdRef.current = sensitivityThreshold; }, [sensitivityThreshold]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeVoiceChannelRef.current = activeVoiceChannel; }, [activeVoiceChannel]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isMicTestingRef.current = isMicTesting; }, [isMicTesting]);
  useEffect(() => { inputVolumeRef.current = inputVolume; }, [inputVolume]);
  useEffect(() => { outputVolumeRef.current = outputVolume; }, [outputVolume]);

  // Pobierz listę urządzeń audio z pełnymi etykietami
  const refreshAudioDevices = async (requestPermissionIfMissing = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      
      let devices = await navigator.mediaDevices.enumerateDevices();
      const hasLabels = devices.some(d => d.kind === 'audioinput' && d.label);

      // Jeśli etykiety są puste, spróbuj poprosić o dostęp do mikrofonu, aby odblokować prawdziwe nazwy urządzeń
      if ((!hasLabels || requestPermissionIfMissing) && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: echoCancellationRef.current,
              noiseSuppression: noiseSuppressionRef.current,
              autoGainControl: autoGainControlRef.current
            }
          });
          setHasMicPermission(true);
          devices = await navigator.mediaDevices.enumerateDevices();
          
          if (!localStreamRef.current) {
            localStreamRef.current = tempStream;
            setupAudioAnalyser(tempStream);
          } else {
            tempStream.getTracks().forEach(t => t.stop());
          }
        } catch (permErr) {
          console.warn('Odmówiono dostępu do mikrofonu:', permErr);
        }
      } else if (hasLabels) {
        setHasMicPermission(true);
      }

      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
    } catch (err) {
      console.warn('Nie udało się pobrać listy urządzeń audio:', err);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => refreshAudioDevices(false));
      return () => navigator.mediaDevices.removeEventListener('devicechange', () => refreshAudioDevices(false));
    }
  }, []);

  // Pobierz prawdziwy strumień audio z wybranego mikrofonu z aktualnymi ustawieniami
  const getLocalAudioStream = async (overrideDeviceId = null, forceNew = false) => {
    const targetDeviceId = overrideDeviceId || selectedAudioInput;
    
    if (localStreamRef.current && !overrideDeviceId && !forceNew) {
      const activeTrack = localStreamRef.current.getAudioTracks()[0];
      if (activeTrack && activeTrack.readyState === 'live' && activeTrack.enabled !== false) {
        return localStreamRef.current;
      }
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      console.warn('navigator.mediaDevices.getUserMedia nie jest dostępne w tej przeglądarce.');
      setHasMicPermission(false);
      return null;
    }

    try {
      const audioConstraints = {
        echoCancellation: echoCancellationRef.current,
        noiseSuppression: noiseSuppressionRef.current,
        autoGainControl: autoGainControlRef.current
      };
      if (targetDeviceId && targetDeviceId !== 'default') {
        audioConstraints.deviceId = { ideal: targetDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      localStreamRef.current = stream;
      setHasMicPermission(true);
      setupAudioAnalyser(stream);
      await refreshAudioDevices(false).catch(() => {});
      return stream;
    } catch (err) {
      console.warn('Próba pobrania wybranego mikrofonu z zaawansowanymi parametrami nie powiodła się, próba prostego audio: true:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = fallbackStream;
        setHasMicPermission(true);
        setupAudioAnalyser(fallbackStream);
        await refreshAudioDevices(false).catch(() => {});
        return fallbackStream;
      } catch (err2) {
        console.warn('Brak dostępu do mikrofonu (brak uprawnień lub urządzenie zajęte):', err2);
        setHasMicPermission(false);
        return null;
      }
    }
  };

  // Jawne żądanie uprawnień do mikrofonu i odblokowanie AudioContext na telefonach
  const requestMicPermission = async () => {
    try {
      // 1. Odblokuj Web Audio AudioContext (Safari iOS / Chrome Android)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume().catch(() => {});
        }
        try {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          gain.gain.value = 0.001;
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.05);
        } catch (e) {}
      }

      // 2. Poproś o dostęp do mikrofonu w bezpośrednim kontekście kliknięcia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: echoCancellationRef.current,
          noiseSuppression: noiseSuppressionRef.current,
          autoGainControl: autoGainControlRef.current
        },
        video: false
      });

      localStreamRef.current = stream;
      setHasMicPermission(true);
      setupAudioAnalyser(stream);
      await refreshAudioDevices(false).catch(() => {});

      // 3. Podepnij ścieżkę audio do aktywnych połączeń WebRTC jeśli jesteśmy w pokoju
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(() => {});
          } else {
            pc.addTrack(audioTrack, stream);
          }
        });
      }

      // 4. Wymuś odtworzenie zdalnych strumieni audio
      audioElementsRef.current.forEach((audio) => {
        audio.play().catch(() => {});
      });

      return true;
    } catch (err) {
      console.warn('Błąd przyznawania uprawnień mikrofonu:', err);
      setHasMicPermission(false);
      return false;
    }
  };

  // Zmiana ustawień przetwarzania dźwięku (tłumienie hałasu, echo, wzmocnienie, czułość bramki)
  const updateAudioProcessingSettings = async (settings) => {
    let shouldUpdateHardware = false;

    if (settings.noiseSuppression !== undefined) {
      setNoiseSuppression(settings.noiseSuppression);
      noiseSuppressionRef.current = settings.noiseSuppression;
      localStorage.setItem('voicechat_noise_suppression', String(settings.noiseSuppression));
      shouldUpdateHardware = true;
    }
    if (settings.echoCancellation !== undefined) {
      setEchoCancellation(settings.echoCancellation);
      echoCancellationRef.current = settings.echoCancellation;
      localStorage.setItem('voicechat_echo_cancellation', String(settings.echoCancellation));
      shouldUpdateHardware = true;
    }
    if (settings.autoGainControl !== undefined) {
      setAutoGainControl(settings.autoGainControl);
      autoGainControlRef.current = settings.autoGainControl;
      localStorage.setItem('voicechat_auto_gain', String(settings.autoGainControl));
      shouldUpdateHardware = true;
    }
    if (settings.isAutoSensitivity !== undefined) {
      setIsAutoSensitivity(settings.isAutoSensitivity);
      isAutoSensitivityRef.current = settings.isAutoSensitivity;
      localStorage.setItem('voicechat_auto_sens', String(settings.isAutoSensitivity));
    }
    if (settings.sensitivityThreshold !== undefined) {
      const num = Number(settings.sensitivityThreshold);
      setSensitivityThreshold(num);
      sensitivityThresholdRef.current = num;
      localStorage.setItem('voicechat_sens_threshold', String(num));
    }

    // Zaaplikuj zmiany do aktywnego strumienia i WebRTC
    if (shouldUpdateHardware && localStreamRef.current) {
      const activeTrack = localStreamRef.current.getAudioTracks()[0];
      let appliedDirectly = false;

      if (activeTrack && typeof activeTrack.applyConstraints === 'function') {
        try {
          await activeTrack.applyConstraints({
            noiseSuppression: noiseSuppressionRef.current,
            echoCancellation: echoCancellationRef.current,
            autoGainControl: autoGainControlRef.current
          });
          appliedDirectly = true;
        } catch (err) {
          console.warn('applyConstraints nie powiodło się, pobieram nowy strumień:', err);
        }
      }

      if (!appliedDirectly) {
        try {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
          const newStream = await getLocalAudioStream(selectedAudioInput, true);
          if (newStream) {
            const newTrack = newStream.getAudioTracks()[0];
            if (newTrack) {
              newTrack.enabled = !isMutedRef.current && !isMicTestingRef.current;
              peerConnectionsRef.current.forEach((pc) => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) sender.replaceTrack(newTrack);
              });
              if (directPeerRef.current) {
                const sender = directPeerRef.current.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) sender.replaceTrack(newTrack);
              }
            }
          }
        } catch (err2) {
          console.warn('Błąd odświeżania strumienia po zmianie ustawień audio:', err2);
        }
      }
    }
  };

  // Zmiana mikrofonu
  const changeAudioInputDevice = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    localStorage.setItem('voicechat_audio_input', deviceId);

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }

      const newStream = await getLocalAudioStream(deviceId, true);
      if (newStream) {
        const newTrack = newStream.getAudioTracks()[0];
        if (newTrack) {
          newTrack.enabled = !isMutedRef.current && !isMicTestingRef.current;
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
          });
          if (directPeerRef.current) {
            const sender = directPeerRef.current.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
          }
        }
      }
    } catch (e) {
      console.error('Błąd zmiany mikrofonu:', e);
    }
  };

  // Zmiana słuchawek / wyjścia audio
  const changeAudioOutputDevice = async (deviceId) => {
    setSelectedAudioOutput(deviceId);
    localStorage.setItem('voicechat_audio_output', deviceId);

    audioElementsRef.current.forEach(async (audio) => {
      if (typeof audio.setSinkId === 'function') {
        try {
          await audio.setSinkId(deviceId === 'default' ? '' : deviceId);
        } catch (err) {
          console.warn('SinkId error:', err);
        }
      }
    });

    if (directAudioRef.current && typeof directAudioRef.current.setSinkId === 'function') {
      try {
        await directAudioRef.current.setSinkId(deviceId === 'default' ? '' : deviceId);
      } catch (err) {
        console.warn('SinkId error:', err);
      }
    }

    if (loopbackAudioElementRef.current && typeof loopbackAudioElementRef.current.setSinkId === 'function') {
      try {
        await loopbackAudioElementRef.current.setSinkId(deviceId === 'default' ? '' : deviceId);
      } catch (err) {
        console.warn('SinkId error:', err);
      }
    }
  };

  // Zmiana głośności wejściowej mikrofonu (0 - 200%)
  const changeInputVolume = (val) => {
    const num = Math.max(0, Math.min(200, Number(val)));
    setInputVolume(num);
    inputVolumeRef.current = num;
    localStorage.setItem('voicechat_input_vol', num);
    if (loopbackAudioElementRef.current && isMicTestingRef.current) {
      loopbackAudioElementRef.current.volume = Math.min(1, (outputVolumeRef.current / 100) * (num / 100));
    }
  };

  // Zmiana głośności wyjściowej słuchawek / głośników (0 - 200%)
  const changeOutputVolume = (val) => {
    const num = Math.max(0, Math.min(200, Number(val)));
    setOutputVolume(num);
    outputVolumeRef.current = num;
    localStorage.setItem('voicechat_output_vol', num);

    audioElementsRef.current.forEach((audio) => {
      audio.volume = Math.min(1, num / 100);
    });
    if (directAudioRef.current) {
      directAudioRef.current.volume = Math.min(1, num / 100);
    }
    if (loopbackAudioElementRef.current && isMicTestingRef.current) {
      loopbackAudioElementRef.current.volume = Math.min(1, (num / 100) * (inputVolumeRef.current / 100));
    }
  };

  // Zakończ test mikrofonu natychmiast i bezwarunkowo
  const stopMicTest = () => {
    setIsMicTesting(false);
    isMicTestingRef.current = false;

    // 1. Zatrzymaj i zresetuj loopback element
    if (loopbackAudioElementRef.current) {
      try {
        loopbackAudioElementRef.current.pause();
        loopbackAudioElementRef.current.srcObject = null;
      } catch (e) {}
    }

    // 2. Rozłącz węzły Web Audio jeśli istnieją
    if (loopbackGainNodeRef.current) {
      try { loopbackGainNodeRef.current.disconnect(); } catch (e) {}
      loopbackGainNodeRef.current = null;
    }
    if (loopbackSourceRef.current) {
      try { loopbackSourceRef.current.disconnect(); } catch (e) {}
      loopbackSourceRef.current = null;
    }
    if (loopbackAudioCtxRef.current) {
      try { loopbackAudioCtxRef.current.close(); } catch (e) {}
      loopbackAudioCtxRef.current = null;
    }

    // 3. Przywróć wysyłanie mikrofonu do rozmówców (jeśli nie jesteśmy zmutowani)
    const shouldEnable = !isMutedRef.current;
    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders().filter(s => s.track?.kind === 'audio');
      senders.forEach(s => {
        if (s.track) s.track.enabled = shouldEnable;
      });
    });
    if (directPeerRef.current) {
      const senders = directPeerRef.current.getSenders().filter(s => s.track?.kind === 'audio');
      senders.forEach(s => {
        if (s.track) s.track.enabled = shouldEnable;
      });
    }
  };

  // Rozpocznij test mikrofonu (odsłuch samego siebie w słuchawkach + tymczasowe wyciszenie dla innych)
  const startMicTest = async () => {
    try {
      stopMicTest();

      const stream = await getLocalAudioStream();
      if (!stream) {
        alert('Nie udało się uzyskać dostępu do mikrofonu.');
        return;
      }

      setIsMicTesting(true);
      isMicTestingRef.current = true;

      // 1. Wycisz wysyłanie audio do innych na czas testu
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders().filter(s => s.track?.kind === 'audio');
        senders.forEach(s => {
          if (s.track) s.track.enabled = false;
        });
      });
      if (directPeerRef.current) {
        const senders = directPeerRef.current.getSenders().filter(s => s.track?.kind === 'audio');
        senders.forEach(s => {
          if (s.track) s.track.enabled = false;
        });
      }

      // 2. Skonfiguruj loopback audio, aby słyszeć samego siebie w słuchawkach
      if (!loopbackAudioElementRef.current) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        loopbackAudioElementRef.current = audio;
      }

      const audio = loopbackAudioElementRef.current;
      audio.srcObject = stream;
      audio.volume = Math.min(1, (outputVolumeRef.current / 100) * (inputVolumeRef.current / 100));
      if (typeof audio.setSinkId === 'function' && selectedAudioOutput !== 'default') {
        try {
          await audio.setSinkId(selectedAudioOutput);
        } catch (e) {}
      }
      await audio.play();
    } catch (err) {
      console.warn('Błąd uruchamiania testu mikrofonu:', err);
      stopMicTest();
    }
  };

  // Analizator głosu (wykrywanie mowy i miernik poziomu głośności 0-100%)
  const setupAudioAnalyser = (stream) => {
    if (!stream) return;
    try {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      let lastMicVolume = 0;
      let lastVolumeUpdate = 0;

      const checkSpeaking = () => {
        if (!analyserRef.current) return;
        
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Płynna aktualizacja paska głośności (z ograniczeniem zbędnych re-renderów)
        const normalized = Math.min(100, Math.round((average / 70) * 100));
        const now = performance.now();
        if (now - lastVolumeUpdate > 60) {
          if (Math.abs(normalized - lastMicVolume) >= 2 || (normalized === 0 && lastMicVolume !== 0)) {
            lastMicVolume = normalized;
            lastVolumeUpdate = now;
            setMicVolume(normalized);
          }
        }

        const threshold = isAutoSensitivityRef.current ? 10 : sensitivityThresholdRef.current;
        const isCurrentlySpeaking = average > threshold && !isMutedRef.current && !isMicTestingRef.current;

        if (isCurrentlySpeaking !== wasSpeaking) {
          wasSpeaking = isCurrentlySpeaking;
          if (activeVoiceChannelRef.current && socketRef.current) {
            socketRef.current.emit('voice-speaking-state', {
              channelId: activeVoiceChannelRef.current.channelId,
              isSpeaking: isCurrentlySpeaking
            });
          }
          if (userRef.current?.id) {
            const currentUserId = userRef.current.id;
            setSpeakingUsers(prev => {
              const next = new Set(prev);
              if (isCurrentlySpeaking) next.add(currentUserId);
              else next.delete(currentUserId);
              return next;
            });
          }
        }
        animFrameRef.current = requestAnimationFrame(checkSpeaking);
      };
      checkSpeaking();
    } catch (e) {
      console.warn('Nie udało się uruchomić analizatora głosu:', e);
    }
  };

  const playTestSound = async () => {
    try {
      const audio = new Audio();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dst = ctx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);

      audio.srcObject = dst.stream;
      if (typeof audio.setSinkId === 'function' && selectedAudioOutput !== 'default') {
        await audio.setSinkId(selectedAudioOutput);
      }
      audio.play();
    } catch (e) {
      console.warn('Błąd testu dźwięku:', e);
    }
  };

  // Pomocnik dodawania buforowanych kandydatów ICE
  const flushPendingCandidates = async (pc, socketId) => {
    const queue = pendingCandidatesRef.current.get(socketId) || [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Błąd dodawania buforowanego kandydata ICE:', e);
      }
    }
    pendingCandidatesRef.current.delete(socketId);
  };

  // --- KANAŁY GŁOSOWE (SERWERY) ---
  const createPeerConnection = async (targetSocketId, targetUser, isInitiator) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      try {
        peerConnectionsRef.current.get(targetSocketId).close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);
    pendingCandidatesRef.current.set(targetSocketId, []);

    // Dodaj lokalne audio jeśli dostępne
    let stream = null;
    try {
      stream = await getLocalAudioStream();
    } catch (e) {
      console.warn('Błąd pobierania audio w createPeerConnection:', e);
    }

    if (stream && stream.getAudioTracks().length > 0) {
      stream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, stream);
        } catch (e) {}
      });
    } else {
      // Jeśli brak mikrofonu lub brak zgody, dodaj transceiver w trybie odbioru (recvonly), aby użytkownik MÓGŁ SŁUCHAĆ innych na telefonie
      try {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {
        console.warn('addTransceiver error:', e);
      }
    }

    // Dodaj lokalny stream ekranu jeśli aktywny
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localScreenStreamRef.current);
        } catch (e) {}
      });
    }

    // Obsługa przychodzących ścieżek
    pc.ontrack = (event) => {
      const track = event.track;
      if (track.kind === 'audio') {
        let audio = audioElementsRef.current.get(targetSocketId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audio.playsInline = true;
          audio.style.display = 'none';
          document.body.appendChild(audio);
          audioElementsRef.current.set(targetSocketId, audio);
        }
        audio.srcObject = event.streams[0];
        audio.muted = isDeafened;
        audio.playsInline = true;

        if (typeof audio.setSinkId === 'function' && selectedAudioOutput !== 'default') {
          audio.setSinkId(selectedAudioOutput).catch(() => {});
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.warn('Autoodtwarzanie zablokowane przez przeglądarkę mobilną, dodaję nasłuchiwacz dotyku/kliknięcia:', playErr);
            const unlockPlay = () => {
              audio.play().catch(() => {});
              document.removeEventListener('click', unlockPlay);
              document.removeEventListener('touchstart', unlockPlay);
            };
            document.addEventListener('click', unlockPlay, { once: true });
            document.addEventListener('touchstart', unlockPlay, { once: true });
          });
        }
      } else if (track.kind === 'video') {
        // Zdalny stream ekranu
        setRemoteScreenStreams(prev => {
          const next = new Map(prev);
          next.set(targetSocketId, {
            user: targetUser,
            stream: event.streams[0]
          });
          return next;
        });

        track.onended = () => {
          setRemoteScreenStreams(prev => {
            const next = new Map(prev);
            next.delete(targetSocketId);
            return next;
          });
        };
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice-signal', {
          targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
          callerUser: user
        });
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-signal', {
          targetSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
          callerUser: user
        });
      } catch (err) {
        console.error('Błąd tworzenia oferty WebRTC:', err);
      }
    }

    return pc;
  };

  const joinVoiceChannel = async (channel, serverId) => {
    if (!socket || !user) return;
    if (activeVoiceChannel?.channelId === channel.id) return;

    if (activeVoiceChannel) {
      leaveVoiceChannel(false);
    }

    // Odblokuj Web Audio dla iOS Safari i Android Chrome w momencie dotknięcia
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      }
    } catch (e) {}

    playJoinSound();

    // ZAWSZE ustaw aktywny stan kanału, żeby interfejs od razu połączył i wyświetlił scenę
    setActiveVoiceChannel({
      channelId: channel.id,
      channelName: channel.name,
      serverId
    });

    const currentUserSafe = {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarColor: user.avatarColor,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl || user.avatar || user.avatarImage || null,
      bannerColor: user.bannerColor || '#5865f2',
      status: user.status || 'online',
      socketId: socket.id
    };

    // Natychmiastowe optymistyczne dodanie siebie do listy uczestników
    setVoiceUsers([{
      user: currentUserSafe,
      isMuted,
      isDeafened,
      isSpeaking: false,
      channelId: channel.id,
      serverId
    }]);

    // Spróbuj pobrać mikrofon w tle bez blokowania połączenia
    try {
      await getLocalAudioStream();
    } catch (e) {
      console.warn('Brak dostępu do mikrofonu podczas dołączania do pokoju głosowego:', e);
    }

    socket.emit('join-voice-channel', {
      channelId: channel.id,
      serverId,
      userId: user.id,
      user: currentUserSafe
    });
  };

  const leaveVoiceChannel = (playSound = true) => {
    if (playSound) playLeaveSound();

    if (isScreenSharing) {
      stopScreenShare();
    }

    if (socket && activeVoiceChannel) {
      socket.emit('leave-voice-channel', {
        channelId: activeVoiceChannel.channelId
      });
    }

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch (e) {}
    });
    audioElementsRef.current.clear();
    setRemoteScreenStreams(new Map());

    setActiveVoiceChannel(null);
    setVoiceUsers([]);
    setSpeakingUsers(new Set());
  };

  // --- UDOSTĘPNIANIE EKRANU (STREAM) ---
  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Twoja przeglądarka lub urządzenie nie obsługuje udostępniania ekranu.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: 30 },
        audio: true
      });

      localScreenStreamRef.current = stream;
      setLocalScreenStream(stream);
      setIsScreenSharing(true);

      const videoTrack = stream.getVideoTracks()[0];

      // Gdy użytkownik kliknie "Zatrzymaj udostępnianie" na pasku przeglądarki
      videoTrack.onended = () => {
        stopScreenShare();
      };

      // 1. Jeśli jesteśmy na kanale serwerowym:
      peerConnectionsRef.current.forEach(async (pc, targetSocketId) => {
        pc.addTrack(videoTrack, stream);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voice-signal', {
            targetSocketId,
            signal: { type: 'offer', sdp: pc.localDescription },
            callerUser: user
          });
        } catch (e) {
          console.warn('Błąd renegocjacji streamu kanału:', e);
        }
      });

      if (socket && activeVoiceChannel) {
        socket.emit('screen-share-started', { channelId: activeVoiceChannel.channelId });
      }

      // 2. Jeśli jesteśmy w rozmowie bezpośredniej 1-na-1 (PV):
      if (directPeerRef.current && directCallPartner) {
        directPeerRef.current.addTrack(videoTrack, stream);
        try {
          const offer = await directPeerRef.current.createOffer();
          await directPeerRef.current.setLocalDescription(offer);
          socket.emit('direct-call-signal', {
            targetSocketId: directCallPartner.socketId,
            signal: { type: 'offer', sdp: directPeerRef.current.localDescription }
          });
        } catch (e) {
          console.warn('Błąd renegocjacji streamu PV:', e);
        }
      }
    } catch (err) {
      console.warn('Anulowano lub błąd udostępniania ekranu:', err);
    }
  };

  const stopScreenShare = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
    }
    setLocalScreenStream(null);
    setIsScreenSharing(false);

    // 1. Usuń sendery wideo w kanale
    peerConnectionsRef.current.forEach(async (pc, targetSocketId) => {
      const senders = pc.getSenders().filter(s => s.track?.kind === 'video');
      senders.forEach(s => pc.removeTrack(s));
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-signal', {
          targetSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
          callerUser: user
        });
      } catch (e) {}
    });

    if (socket && activeVoiceChannel) {
      socket.emit('screen-share-stopped', { channelId: activeVoiceChannel.channelId });
    }

    // 2. Usuń sendery wideo w rozmowie PV
    if (directPeerRef.current && directCallPartner) {
      const senders = directPeerRef.current.getSenders().filter(s => s.track?.kind === 'video');
      senders.forEach(s => directPeerRef.current.removeTrack(s));
      directPeerRef.current.createOffer().then(offer => {
        return directPeerRef.current.setLocalDescription(offer);
      }).then(() => {
        socket.emit('direct-call-signal', {
          targetSocketId: directCallPartner.socketId,
          signal: { type: 'offer', sdp: directPeerRef.current.localDescription }
        });
      }).catch(() => {});
    }
  };

  // --- ROZMOWY GŁOSOWE 1-ON-1 (PV) ---
  const startDirectCall = async (targetUser) => {
    if (!socket || !targetUser) return;
    if (activeVoiceChannel) leaveVoiceChannel(false);

    playJoinSound();
    setDirectCallState('calling');
    setDirectCallPartner(targetUser);
    startRingtone();

    socket.emit('start-direct-call', { targetUserId: targetUser.id });
  };

  const acceptDirectCall = async () => {
    if (!socket || !incomingCall) return;
    stopRingtone();
    playJoinSound();

    if (activeVoiceChannel) leaveVoiceChannel(false);

    const partner = incomingCall;
    setDirectCallPartner(partner);
    setDirectCallState('connected');
    setIncomingCall(null);

    const stream = await getLocalAudioStream();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    directPeerRef.current = pc;
    directPendingCandidatesRef.current = [];

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      if (event.track.kind === 'video') {
        setDirectRemoteScreenStream(event.streams[0]);
        event.track.onended = () => {
          setDirectRemoteScreenStream(null);
        };
      } else {
        if (!directAudioRef.current) {
          directAudioRef.current = new Audio();
          directAudioRef.current.autoplay = true;
          directAudioRef.current.playsInline = true;
          directAudioRef.current.style.display = 'none';
          document.body.appendChild(directAudioRef.current);
        }
        directAudioRef.current.srcObject = event.streams[0];
        directAudioRef.current.muted = isDeafened;
        if (typeof directAudioRef.current.setSinkId === 'function' && selectedAudioOutput !== 'default') {
          directAudioRef.current.setSinkId(selectedAudioOutput).catch(() => {});
        }
        directAudioRef.current.play().catch(() => {
          document.addEventListener('click', () => directAudioRef.current?.play().catch(() => {}), { once: true });
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('direct-call-signal', {
          targetSocketId: partner.socketId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    socket.emit('accept-direct-call', { callerSocketId: partner.socketId });
  };

  const rejectDirectCall = () => {
    stopRingtone();
    if (socket && incomingCall) {
      socket.emit('reject-direct-call', { callerSocketId: incomingCall.socketId });
    }
    setIncomingCall(null);
  };

  const endDirectCall = () => {
    stopRingtone();
    playLeaveSound();

    if (socket && directCallPartner) {
      socket.emit('end-direct-call', {
        targetSocketId: directCallPartner.socketId,
        targetUserId: directCallPartner.id
      });
    }

    if (directPeerRef.current) {
      directPeerRef.current.close();
      directPeerRef.current = null;
    }

    if (directAudioRef.current) {
      directAudioRef.current.pause();
      directAudioRef.current.srcObject = null;
      if (directAudioRef.current.parentNode) {
        directAudioRef.current.parentNode.removeChild(directAudioRef.current);
      }
    }

    setDirectRemoteScreenStream(null);
    if (isScreenSharing && !activeVoiceChannel) {
      stopScreenShare();
    }

    setDirectCallState(null);
    setDirectCallPartner(null);
    setCallDuration(0);
    clearInterval(durationTimerRef.current);
  };

  useEffect(() => {
    if (directCallState === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      clearInterval(durationTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [directCallState]);

  // Nasłuchiwanie Socket.io WebRTC
  useEffect(() => {
    if (!socket) return;

    socket.on('voice-room-users', async ({ channelId, users }) => {
      setVoiceUsers(users || []);
      for (const peer of (users || [])) {
        const peerUser = peer.user || peer;
        const pSocketId = peerUser?.socketId || peer.socketId;
        const pUserId = peerUser?.id || peer.id;
        if (pSocketId && pSocketId !== socket.id && pUserId !== user?.id) {
          await createPeerConnection(pSocketId, peerUser, true);
        }
      }
    });

    socket.on('user-joined-voice', ({ user: newUser }) => {
      setVoiceUsers(prev => {
        const filtered = prev.filter(p => (p.user?.id || p.id) !== newUser.id);
        return [...filtered, { user: newUser, channelId: activeVoiceChannelRef.current?.channelId }];
      });
    });

    socket.on('user-left-voice', ({ socketId, userId }) => {
      setVoiceUsers(prev => prev.filter(p => (p.user?.socketId || p.socketId) !== socketId && (p.user?.id || p.id) !== userId));
      setSpeakingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      const audio = audioElementsRef.current.get(socketId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
        audioElementsRef.current.delete(socketId);
      }
      setRemoteScreenStreams(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('voice-signal', async ({ signal, callerSocketId, callerUser }) => {
      let pc = peerConnectionsRef.current.get(callerSocketId);
      if (!pc) {
        pc = await createPeerConnection(callerSocketId, callerUser, false);
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(pc, callerSocketId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice-signal', {
            targetSocketId: callerSocketId,
            signal: { type: 'answer', sdp: pc.localDescription },
            callerUser: user
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(pc, callerSocketId);
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const q = pendingCandidatesRef.current.get(callerSocketId) || [];
            q.push(signal.candidate);
            pendingCandidatesRef.current.set(callerSocketId, q);
          }
        }
      } catch (err) {
        console.error('Błąd przetwarzania sygnału WebRTC:', err);
      }
    });

    socket.on('direct-call-accepted', async ({ accepter }) => {
      stopRingtone();
      setDirectCallState('connected');
      setDirectCallPartner(accepter);

      const stream = await getLocalAudioStream();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      directPeerRef.current = pc;
      directPendingCandidatesRef.current = [];

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        if (event.track.kind === 'video') {
          setDirectRemoteScreenStream(event.streams[0]);
          event.track.onended = () => {
            setDirectRemoteScreenStream(null);
          };
        } else {
          if (!directAudioRef.current) {
            directAudioRef.current = new Audio();
            directAudioRef.current.autoplay = true;
            directAudioRef.current.playsInline = true;
          }
          directAudioRef.current.srcObject = event.streams[0];
          directAudioRef.current.muted = isDeafened;
          if (typeof directAudioRef.current.setSinkId === 'function' && selectedAudioOutput !== 'default') {
            directAudioRef.current.setSinkId(selectedAudioOutput).catch(() => {});
          }
          directAudioRef.current.play().catch(() => {
            document.addEventListener('click', () => directAudioRef.current?.play().catch(() => {}), { once: true });
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('direct-call-signal', {
            targetSocketId: accepter.socketId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('direct-call-signal', {
        targetSocketId: accepter.socketId,
        signal: { type: 'offer', sdp: pc.localDescription }
      });
    });

    socket.on('direct-call-rejected', () => {
      stopRingtone();
      setDirectCallState(null);
      setDirectCallPartner(null);
      alert('Połączenie zostało odrzucone.');
    });

    socket.on('direct-call-failed', ({ reason }) => {
      stopRingtone();
      setDirectCallState(null);
      setDirectCallPartner(null);
      alert(reason || 'Nie udało się nawiązać połączenia.');
    });

    socket.on('direct-call-ended', () => {
      stopRingtone();
      playLeaveSound();
      if (directPeerRef.current) {
        directPeerRef.current.close();
        directPeerRef.current = null;
      }
      if (directAudioRef.current) {
        directAudioRef.current.pause();
        directAudioRef.current.srcObject = null;
      }
      setDirectRemoteScreenStream(null);
      if (isScreenSharing && !activeVoiceChannel) {
        stopScreenShare();
      }
      setDirectCallState(null);
      setDirectCallPartner(null);
      setCallDuration(0);
    });

    socket.on('direct-call-signal', async ({ fromSocketId, signal }) => {
      const pc = directPeerRef.current;
      if (!pc) {
        if (signal.type === 'candidate') {
          directPendingCandidatesRef.current.push(signal.candidate);
        }
        return;
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const cand of directPendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          directPendingCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('direct-call-signal', {
            targetSocketId: fromSocketId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const cand of directPendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          directPendingCandidatesRef.current = [];
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            directPendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('Błąd sygnalizacji rozmowy PV:', err);
      }
    });

    socket.on('forced-voice-channel-switch', ({ channelId, channelName, serverId }) => {
      console.log('Przeniesiono do kanału głosowego:', channelName);
      joinVoiceChannel({ id: channelId, name: channelName, type: 'voice' }, serverId);
    });

    socket.on('user-speaking-changed', ({ userId, isSpeaking }) => {
      setSpeakingUsers(prev => {
        const next = new Set(prev);
        if (isSpeaking) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on('voice-join-denied', ({ channelId, message }) => {
      alert(message || 'Brak uprawnień do dołączenia do tego kanału głosowego.');
      setActiveVoiceChannel(null);
      setVoiceUsers([]);
    });

    socket.on('error-notice', ({ message }) => {
      alert(message || 'Wystąpił błąd.');
    });

    return () => {
      socket.off('voice-room-users');
      socket.off('user-joined-voice');
      socket.off('user-left-voice');
      socket.off('voice-signal');
      socket.off('direct-call-accepted');
      socket.off('direct-call-rejected');
      socket.off('direct-call-failed');
      socket.off('direct-call-ended');
      socket.off('direct-call-signal');
      socket.off('user-speaking-changed');
      socket.off('forced-voice-channel-switch');
      socket.off('voice-join-denied');
      socket.off('error-notice');
    };
  }, [socket, user, isDeafened, activeVoiceChannel, selectedAudioOutput]);

  const moveVoiceUser = (targetUserId, targetChannelId, serverId) => {
    if (!socket || !targetUserId || !targetChannelId || !serverId) return;
    socket.emit('move-voice-user', {
      targetUserId,
      targetChannelId,
      serverId
    });
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playMuteSound(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }

    if (activeVoiceChannel && socket) {
      socket.emit('voice-mute-state', {
        channelId: activeVoiceChannel.channelId,
        isMuted: nextMuted,
        isDeafened
      });
    }
  };

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    playMuteSound(nextDeafened);

    if (nextDeafened && !isMuted) {
      toggleMute();
    }

    audioElementsRef.current.forEach(audio => {
      audio.muted = nextDeafened;
    });

    if (directAudioRef.current) {
      directAudioRef.current.muted = nextDeafened;
    }

    if (activeVoiceChannel && socket) {
      socket.emit('voice-mute-state', {
        channelId: activeVoiceChannel.channelId,
        isMuted,
        isDeafened: nextDeafened
      });
    }
  };

  useEffect(() => {
    if (incomingCall) {
      startRingtone();
    }
  }, [incomingCall]);

  return (
    <VoiceContext.Provider value={{
      activeVoiceChannel,
      voiceUsers,
      speakingUsers,
      isMuted,
      isDeafened,
      micVolume,
      joinVoiceChannel,
      leaveVoiceChannel,
      moveVoiceUser,
      toggleMute,
      toggleDeafen,
      directCallState,
      directCallPartner,
      callDuration,
      startDirectCall,
      acceptDirectCall,
      rejectDirectCall,
      endDirectCall,
      audioInputDevices,
      audioOutputDevices,
      selectedAudioInput,
      selectedAudioOutput,
      hasMicPermission,
      requestMicPermission,
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
      updateAudioProcessingSettings,
      isScreenSharing,
      localScreenStream,
      remoteScreenStreams,
      directRemoteScreenStream,
      startScreenShare,
      stopScreenShare
    }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
};
