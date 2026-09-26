import express from 'express';
import { db } from '../db.js';
import { authenticateJWT } from '../auth.js';

const router = express.Router();

// Pobierz listę wszystkich użytkowników (do wyszukiwania znajomych / członków)
router.get('/', authenticateJWT, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// Pobierz znajomych zalogowanego użytkownika
router.get('/friends', authenticateJWT, (req, res) => {
  const friends = db.getFriendsForUser(req.user.id);
  res.json({ friends });
});

// Aktualizacja profilu (zmiana nazwy, awatara, statusu, bio)
router.patch('/profile', authenticateJWT, (req, res) => {
  try {
    const { displayName, avatarColor, avatarEmoji, status, customStatus, bio } = req.body;
    const updates = {};

    if (displayName !== undefined && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;
    if (avatarEmoji !== undefined) updates.avatarEmoji = avatarEmoji;
    if (status !== undefined) updates.status = status;
    if (customStatus !== undefined) updates.customStatus = customStatus;
    if (bio !== undefined) updates.bio = bio;

    const updatedUser = db.updateUser(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Nie znaleziono użytkownika.' });
    }

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Błąd aktualizacji profilu:', err);
    res.status(500).json({ error: 'Błąd podczas zapisywania zmian profilu.' });
  }
});

// Pobierz profil pojedynczego użytkownika
router.get('/:id', authenticateJWT, (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

export default router;
