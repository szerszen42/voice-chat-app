import express from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, generateToken, authenticateJWT } from '../auth.js';

const router = express.Router();

// Rejestracja nowego użytkownika
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, avatarEmoji, avatarColor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Nazwa użytkownika, email i hasło są wymagane.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Nazwa użytkownika musi mieć minimum 3 znaki.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Hasło musi mieć minimum 4 znaki.' });
    }

    if (db.findUserByUsername(username)) {
      return res.status(400).json({ error: 'Użytkownik o takiej nazwie już istnieje.' });
    }

    if (db.findUserByEmail(email)) {
      return res.status(400).json({ error: 'Konto z tym adresem email już istnieje.' });
    }

    const defaultColors = ['#5865f2', '#eb459e', '#23a55a', '#f0b232', '#9b59b6', '#e67e22', '#00b0f4'];
    const defaultEmojis = ['🎮', '🚀', '🐱', '🎧', '⚡', '🔥', '🦊', '👾', '🌟'];

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: (displayName || username).trim(),
      avatarColor: avatarColor || defaultColors[Math.floor(Math.random() * defaultColors.length)],
      avatarEmoji: avatarEmoji || defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)],
      status: 'online',
      customStatus: '',
      bio: 'Nowy użytkownik VoiceChat',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Błąd rejestracji:', err);
    return res.status(500).json({ error: 'Wystąpił błąd podczas rejestracji.' });
  }
});

// Logowanie
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body; // login to email lub username

    if (!login || !password) {
      return res.status(400).json({ error: 'Login i hasło są wymagane.' });
    }

    let user = db.findUserByEmail(login);
    if (!user) {
      user = db.findUserByUsername(login);
    }

    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło.' });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło.' });
    }

    // Ustaw status online
    db.updateUser(user.id, { status: 'online' });

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Błąd logowania:', err);
    return res.status(500).json({ error: 'Wystąpił błąd podczas logowania.' });
  }
});

// Weryfikacja zalogowanego profilu (Me) z autoodtwarzaniem po restarcie serwera
router.get('/me', authenticateJWT, (req, res) => {
  let user = db.findUserById(req.user.id);
  
  if (!user) {
    // Autoodtwarzanie konta po restarcie kontenera Render na podstawie poprawnego tokenu JWT
    user = {
      id: req.user.id,
      username: req.user.username || 'user',
      email: `${(req.user.username || 'user').toLowerCase()}@voicechat.local`,
      passwordHash: '',
      displayName: req.user.displayName || req.user.username || 'Użytkownik',
      avatarColor: '#5865f2',
      avatarEmoji: '🎮',
      status: 'online',
      customStatus: '',
      bio: 'Użytkownik VoiceChat',
      createdAt: new Date().toISOString()
    };
    db.createUser(user);
    console.log(`🔄 [Auto-Heal] Przywrócono użytkownika ${user.username} (${user.id}) po restarcie bazy.`);

    // Dołącz użytkownika do domyślnego serwera publicznego
    const publicServers = db.getPublicServers();
    if (publicServers.length > 0) {
      db.addServerMember(publicServers[0].id, user.id);
    }
  }

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

export default router;
