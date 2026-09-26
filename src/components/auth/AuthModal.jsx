import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, Mic, Lock, User, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Pola formularza
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [avatarColor, setAvatarColor] = useState('#5865f2');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emojiOptions = ['🎮', '🚀', '🎧', '⚡', '🔥', '🌸', '🦊', '🐱', '👾', '🌟'];
  const colorOptions = ['#5865f2', '#eb459e', '#23a55a', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          email: email.trim(),
          password,
          avatarEmoji,
          avatarColor
        });
      } else {
        await login(loginInput.trim(), password);
      }
    } catch (err) {
      setError(err.message || 'Wystąpił błąd autoryzacji.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userLogin, userPass) => {
    setError('');
    setLoading(true);
    try {
      await login(userLogin, userPass);
    } catch (err) {
      setError(err.message || 'Błąd logowania konta testowego.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/95 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-dark-800 border border-dark-600/80 w-full max-w-md rounded-2xl p-8 shadow-2xl relative text-dark-100 animate-fade-in">
        {/* Logo & Nagłówek */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/30">
            <Mic size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">VoiceChat & Community</h1>
          <p className="text-xs text-dark-300 mt-1">
            Rozmowy głosowe i czat dla Ciebie i Twoich znajomych
          </p>
        </div>

        {/* Przełącznik Logowanie / Rejestracja */}
        <div className="grid grid-cols-2 bg-dark-900 p-1 rounded-xl mb-6 border border-dark-700">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegisterMode
                ? 'bg-dark-700 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              isRegisterMode
                ? 'bg-dark-700 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Rejestracja
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Formularz */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRegisterMode ? (
            // Formularz Logowania
            <>
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Email lub Nazwa użytkownika
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="np. piotrek@example.com lub Piotrek"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2.5 pl-9 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                  <User size={16} className="absolute left-3 top-3 text-dark-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Hasło
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wpisz hasło..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2.5 pl-9 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-dark-400" />
                </div>
              </div>
            </>
          ) : (
            // Formularz Rejestracji
            <>
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Nazwa użytkownika (Login) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="np. Michal_Gamer"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 pl-9 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                  <User size={16} className="absolute left-3 top-2.5 text-dark-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Nazwa wyświetlana (Nick)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="np. Michał"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Adres Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="twoj@email.com"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 pl-9 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                  <Mail size={16} className="absolute left-3 top-2.5 text-dark-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Hasło *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 4 znaki..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 pl-9 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                  <Lock size={16} className="absolute left-3 top-2.5 text-dark-400" />
                </div>
              </div>

              {/* Wybór ikony i koloru */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Awatar
                  </label>
                  <div className="flex flex-wrap gap-1 bg-dark-900 p-1.5 rounded-lg border border-dark-700 max-h-20 overflow-y-auto">
                    {emojiOptions.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setAvatarEmoji(em)}
                        className={`text-base p-1 rounded hover:bg-dark-700 ${avatarEmoji === em ? 'bg-dark-600 ring-1 ring-brand-500' : ''}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Kolor
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-dark-900 p-2 rounded-lg border border-dark-700">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAvatarColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${avatarColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Przetwarzanie...' : (isRegisterMode ? 'Zarejestruj konto' : 'Zaloguj się')}
          </button>
        </form>
      </div>
    </div>
  );
};
