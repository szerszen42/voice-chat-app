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
    { urls: 'stun:global.stun.twilio.com:3478' }
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

  // Referencje WebRTC i Audio
  const localStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map()); // socketId -> HTMLAudioElement
  const pendingCandidatesRef = useRef(new Map()); // socketId -> Array<RTCIceCandidateInit>
  const directPeerRef = useRef(null);
  const directAudioRef = useRef(null);
  const directPendingCandidatesRef = useRef([]);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Pobierz listę urządzeń audio
  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
    } catch (err) {
      console.warn('Nie udało się pobrać listy urządzeń audio:', err);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
    }
  }, []);

  // Pobierz strumień audio z wybranego mikrofonu
  const getLocalAudioStream = async (overrideDeviceId = null) => {
    const targetDeviceId = overrideDeviceId || selectedAudioInput;
    if (localStreamRef.current && !overrideDeviceId) {
      return localStreamRef.current;
    }

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      if (targetDeviceId && targetDeviceId !== 'default') {
        audioConstraints.deviceId = { exact: targetDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      localStreamRef.current = stream;
      setupAudioAnalyser(stream);
      refreshAudioDevices();
      return stream;
    } catch (err) {
      console.warn('Brak dostępu do mikrofonu, tworzenie cichego strumienia zastępczego:', err);
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const dst = audioCtx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const silentTrack = dst.stream.getAudioTracks()[0];
        silentTrack.enabled = false;
        const fakeStream = new MediaStream([silentTrack]);
        localStreamRef.current = fakeStream;
        return fakeStream;
      } catch (e) {
        return null;
      }
    }
  };

  // Zmiana mikrofonu
  const changeAudioInputDevice = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    localStorage.setItem('voicechat_audio_input', deviceId);

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        const newStream = await getLocalAudioStream(deviceId);
        const newTrack = newStream.getAudioTracks()[0];

        if (newTrack) {
          newTrack.enabled = !isMuted;
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
          });
          if (directPeerRef.current) {
            const sender = directPeerRef.current.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
          }
        }
      } catch (e) {
        console.error('Błąd zmiany mikrofonu:', e);
      }
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
  };

  // Analizator głosu (wykrywanie mowy)
  const setupAudioAnalyser = (stream) => {
    try {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkSpeaking = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalized);

        const isCurrentlySpeaking = average > 14 && !isMuted;

        if (isCurrentlySpeaking !== wasSpeaking) {
          wasSpeaking = isCurrentlySpeaking;
          if (activeVoiceChannel && socket) {
            socket.emit('voice-speaking-state', {
              channelId: activeVoiceChannel.channelId,
              isSpeaking: isCurrentlySpeaking
            });
          }
          if (user?.id) {
            setSpeakingUsers(prev => {
              const next = new Set(prev);
              if (isCurrentlySpeaking) next.add(user.id);
              else next.delete(user.id);
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
      peerConnectionsRef.current.get(targetSocketId).close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);
    pendingCandidatesRef.current.set(targetSocketId, []);

    // Dodaj lokalne audio
    const stream = await getLocalAudioStream();
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Dodaj lokalny stream ekranu jeśli aktywny
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localScreenStreamRef.current);
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
          audioElementsRef.current.set(targetSocketId, audio);
        }
        audio.srcObject = event.streams[0];
        audio.muted = isDeafened;

        if (typeof audio.setSinkId === 'function' && selectedAudioOutput !== 'default') {
          audio.setSinkId(selectedAudioOutput).catch(() => {});
        }

        audio.play().catch(() => {
          document.addEventListener('click', () => audio.play().catch(() => {}), { once: true });
        });
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

    playJoinSound();
    await getLocalAudioStream();

    setActiveVoiceChannel({
      channelId: channel.id,
      channelName: channel.name,
      serverId
    });

    socket.emit('join-voice-channel', {
      channelId: channel.id,
      serverId
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

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
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
      setVoiceUsers(users);
      for (const peer of users) {
        const peerUser = peer.user || peer;
        if (peerUser?.socketId && peerUser.socketId !== socket.id) {
          await createPeerConnection(peerUser.socketId, peerUser, true);
        }
      }
    });

    socket.on('user-joined-voice', ({ user: newUser }) => {
      setVoiceUsers(prev => [...prev.filter(p => (p.user?.id || p.id) !== newUser.id), { user: newUser }]);
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

    socket.on('user-speaking-changed', ({ userId, isSpeaking }) => {
      setSpeakingUsers(prev => {
        const next = new Set(prev);
        if (isSpeaking) next.add(userId);
        else next.delete(userId);
        return next;
      });
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
    };
  }, [socket, user, isDeafened, activeVoiceChannel, selectedAudioOutput]);

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
      changeAudioInputDevice,
      changeAudioOutputDevice,
      refreshAudioDevices,
      playTestSound,
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
