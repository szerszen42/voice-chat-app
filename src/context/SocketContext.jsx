import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { playMessageSound } from '../utils/sounds';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [voiceStates, setVoiceStates] = useState({}); // channelId -> Array of user objects

  useEffect(() => {
    // Połączenie z serwerem Socket.io
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Połączono z Socket.io:', newSocket.id);
      if (user?.id) {
        newSocket.emit('register-user', { userId: user.id });
      }
    });

    newSocket.on('user-status-changed', ({ userId, status }) => {
      setUserStatuses(prev => ({
        ...prev,
        [userId]: status
      }));
    });

    newSocket.on('voice-state-update', ({ channelId, users }) => {
      setVoiceStates(prev => ({
        ...prev,
        [channelId]: users
      }));
    });

    // Powiadomienie o przychodzącym połączeniu 1-na-1
    newSocket.on('incoming-direct-call', ({ caller }) => {
      console.log('📞 Przychodzące połączenie od:', caller);
      setIncomingCall(caller);
    });

    newSocket.on('direct-call-ended', () => {
      setIncomingCall(null);
    });

    newSocket.on('direct-call-rejected', () => {
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Gdy użytkownik się zaloguje/zmieni, zarejestruj go w socketach
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('register-user', { userId: user.id });
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={{
      socket,
      userStatuses,
      voiceStates,
      incomingCall,
      setIncomingCall
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
