import express from 'express';
import { db } from '../db.js';
import { authenticateJWT } from '../auth.js';

const router = express.Router();

// Pobierz listę wszystkich użytkowników (do wyszukiwania znajomych / członków)
router.get('/', authenticateJWT, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// Pobierz znajomych oraz oczekujące zaproszenia zalogowanego użytkownika
router.get('/friends', authenticateJWT, (req, res) => {
  const friends = db.getFriendsForUser(req.user.id);
  const { incoming, outgoing } = db.getPendingRequestsForUser(req.user.id);
  res.json({ friends, incoming, outgoing });
});

// Wyszukaj i wyślij zaproszenie do znajomych (np. wpisując nick)
router.post('/friends/request', authenticateJWT, (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Wpisz nazwę użytkownika, którego chcesz dodać!' });
  }

  const result = db.sendFriendRequest(req.user.id, username);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

// Zaakceptuj zaproszenie do znajomych
router.post('/friends/accept', authenticateJWT, (req, res) => {
  const { requestId, senderId } = req.body;
  const targetId = requestId || senderId;
  if (!targetId) {
    return res.status(400).json({ error: 'Brak identyfikatora zaproszenia.' });
  }

  const result = db.acceptFriendRequest(req.user.id, targetId);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

// Odrzuć lub anuluj zaproszenie do znajomych
router.post('/friends/decline', authenticateJWT, (req, res) => {
  const { requestId, targetId } = req.body;
  const idToDecline = requestId || targetId;
  if (!idToDecline) {
    return res.status(400).json({ error: 'Brak identyfikatora zaproszenia.' });
  }

  const result = db.declineOrCancelFriendRequest(req.user.id, idToDecline);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

// Usuń znajomego
router.delete('/friends/:friendId', authenticateJWT, (req, res) => {
  const result = db.removeFriend(req.user.id, req.params.friendId);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true });
});

// Aktualizacja profilu (zmiana nazwy, awatara, banera, statusu, bio)
router.patch('/profile', authenticateJWT, (req, res) => {
  try {
    const { displayName, avatarUrl, avatarColor, avatarEmoji, bannerColor, status, customStatus, bio } = req.body;
    const updates = {};

    if (displayName !== undefined && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;
    if (avatarEmoji !== undefined) updates.avatarEmoji = avatarEmoji;
    if (bannerColor !== undefined) updates.bannerColor = bannerColor;
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

// Pobierz profil pojedynczego użytkownika z relacjami (wspólne serwery i wspólni znajomi)
router.get('/:id/profile', authenticateJWT, (req, res) => {
  const targetUser = db.findUserById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
  }
  const { passwordHash: _, ...safeUser } = targetUser;
  const mutualServers = db.getMutualServers(req.user.id, targetUser.id);
  const mutualFriends = db.getMutualFriends(req.user.id, targetUser.id);
  const friendshipRelation = db.getFriendshipRelation(req.user.id, targetUser.id);

  res.json({
    user: safeUser,
    mutualServers,
    mutualFriends,
    friendshipRelation
  });
});

// Pobierz podstawowy profil pojedynczego użytkownika
router.get('/:id', authenticateJWT, (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

export default router;
