import express from 'express';
import { db } from '../db.js';
import { authenticateJWT } from '../auth.js';

const router = express.Router();

// Pobierz listę ostatnich konwersacji DM dla zalogowanego użytkownika
router.get('/conversations', authenticateJWT, (req, res) => {
  const currentUserId = req.user.id;
  const directMessages = db.data.directMessages || [];
  
  // Znajdź wszystkich użytkowników, z którymi prowadzono rozmowę
  const partnerMap = new Map();

  directMessages.forEach(dm => {
    let partnerId = null;
    if (dm.senderId === currentUserId) partnerId = dm.recipientId;
    else if (dm.recipientId === currentUserId) partnerId = dm.senderId;

    if (partnerId) {
      if (!partnerMap.has(partnerId) || new Date(dm.createdAt) > new Date(partnerMap.get(partnerId).lastMessage.createdAt)) {
        partnerMap.set(partnerId, {
          lastMessage: dm
        });
      }
    }
  });

  // Dodaj również znajomych z listy
  const friends = db.getFriendsForUser(currentUserId);
  friends.forEach(f => {
    if (!partnerMap.has(f.id)) {
      partnerMap.set(f.id, {
        lastMessage: null
      });
    }
  });

  const conversations = [];
  partnerMap.forEach((val, partnerId) => {
    const user = db.findUserById(partnerId);
    if (user) {
      const { passwordHash: _, ...safeUser } = user;
      conversations.push({
        user: safeUser,
        lastMessage: val.lastMessage
      });
    }
  });

  // Sortuj według najnowszej wiadomości
  conversations.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  res.json({ conversations });
});

// Pobierz historię wiadomości prywatnych z konkretnym użytkownikiem
router.get('/:recipientId', authenticateJWT, (req, res) => {
  const currentUserId = req.user.id;
  const recipientId = req.params.recipientId;

  const recipient = db.findUserById(recipientId);
  if (!recipient) {
    return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
  }

  const messages = db.getDirectMessagesBetween(currentUserId, recipientId, 100);
  const { passwordHash: _, ...safeRecipient } = recipient;

  res.json({
    recipient: safeRecipient,
    messages
  });
});

export default router;
