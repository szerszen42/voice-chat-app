import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('voicechat_token');
      if (token) {
        try {
          const res = await api.getMe();
          let currentUser = res.user;

          // Sprawdź czy mamy zapisany awatar/profil w pamięci podręcznej przeglądarki
          const cachedProfileRaw = localStorage.getItem('voicechat_user_profile');
          if (cachedProfileRaw) {
            try {
              const cached = JSON.parse(cachedProfileRaw);
              if (cached && (cached.id === currentUser.id || cached.username === currentUser.username)) {
                // Jeśli serwer nie ma awatara, a w cache jest zapisany, przywróć go i zsynchronizuj z serwerem
                if (cached.avatarUrl && !currentUser.avatarUrl) {
                  currentUser.avatarUrl = cached.avatarUrl;
                  currentUser.avatarColor = cached.avatarColor || currentUser.avatarColor;
                  currentUser.avatarEmoji = cached.avatarEmoji || currentUser.avatarEmoji;
                  currentUser.bannerColor = cached.bannerColor || currentUser.bannerColor;
                  currentUser.customStatus = cached.customStatus || currentUser.customStatus;

                  // Cicha synchronizacja w tle
                  api.updateProfile({
                    avatarUrl: cached.avatarUrl,
                    avatarColor: currentUser.avatarColor,
                    avatarEmoji: currentUser.avatarEmoji,
                    bannerColor: currentUser.bannerColor,
                    customStatus: currentUser.customStatus
                  }).catch(() => {});
                }
              }
            } catch (e) {}
          }

          localStorage.setItem('voicechat_user_profile', JSON.stringify(currentUser));
          setUser(currentUser);
        } catch (err) {
          console.warn('Nie udało się przywrócić sesji:', err);
          localStorage.removeItem('voicechat_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (loginId, password) => {
    const res = await api.login(loginId, password);
    localStorage.setItem('voicechat_token', res.token);
    localStorage.setItem('voicechat_user_profile', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('voicechat_token', res.token);
    localStorage.setItem('voicechat_user_profile', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('voicechat_token');
    localStorage.removeItem('voicechat_user_profile');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const res = await api.updateProfile(updates);
    localStorage.setItem('voicechat_user_profile', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
