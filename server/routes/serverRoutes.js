import express from 'express';
import { db } from '../db.js';
import { authenticateJWT } from '../auth.js';

const router = express.Router();

// Pobierz serwery, do których należy zalogowany użytkownik
router.get('/my', authenticateJWT, (req, res) => {
  const allServers = db.getAllServers();
  const myServers = allServers.filter(s => s.members && s.members.includes(req.user.id));
  res.json({ servers: myServers });
});

// Pobierz listę serwerów publicznych (Katalog do odkrywania)
router.get('/explore', authenticateJWT, (req, res) => {
  const publicServers = db.getPublicServers().map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    color: s.color,
    memberCount: s.members ? s.members.length : 0,
    isMember: s.members ? s.members.includes(req.user.id) : false,
    channelCount: s.channels ? s.channels.length : 0,
    createdAt: s.createdAt
  }));
  res.json({ servers: publicServers });
});

// Utwórz nowy serwer (publiczny lub prywatny)
router.post('/', authenticateJWT, (req, res) => {
  try {
    const { name, description, icon, color, isPublic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nazwa serwera jest wymagana.' });
    }

    // Generuj unikalny kod zaproszenia dla serwera prywatnego/publicznego
    const inviteCode = `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newServer = {
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description ? description.trim() : '',
      icon: icon || '💬',
      color: color || '#5865f2',
      isPublic: Boolean(isPublic),
      ownerId: req.user.id,
      inviteCode,
      members: [req.user.id],
      channels: [
        { id: `ch-text-${Date.now()}-1`, name: 'ogólny', type: 'text', topic: 'Główny kanał tekstowy' },
        { id: `ch-text-${Date.now()}-2`, name: 'pogawędki', type: 'text', topic: 'Swobodne rozmowy' },
        { id: `ch-voice-${Date.now()}-1`, name: '🔊 Pokój Główny', type: 'voice' },
        { id: `ch-voice-${Date.now()}-2`, name: '🔊 Rozmowy Ciche', type: 'voice' }
      ],
      createdAt: new Date().toISOString()
    };

    db.createServer(newServer);
    res.status(201).json({ server: newServer });
  } catch (err) {
    console.error('Błąd tworzenia serwera:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas tworzenia serwera.' });
  }
});

// Dołącz do serwera publicznego
router.post('/:id/join-public', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Nie znaleziono serwera.' });
  }

  if (!server.isPublic) {
    return res.status(403).json({ error: 'Ten serwer jest prywatny. Wymagany jest kod zaproszenia.' });
  }

  db.addServerMember(server.id, req.user.id);
  const updatedServer = db.getServerById(server.id);
  res.json({ server: updatedServer });
});

// Dołącz do serwera za pomocą kodu zaproszenia (dla prywatnych i publicznych)
router.post('/join-invite', authenticateJWT, (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Wpisz kod zaproszenia.' });
  }

  const server = db.getServerByInviteCode(code);
  if (!server) {
    return res.status(404).json({ error: 'Nieprawidłowy lub nieistniejący kod zaproszenia.' });
  }

  db.addServerMember(server.id, req.user.id);
  const updatedServer = db.getServerById(server.id);
  res.json({ server: updatedServer });
});

// Pobierz szczegóły pojedynczego serwera (z kanałami, rolami i członkami)
router.get('/:id', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  // Pobierz dane użytkowników będących członkami wraz z ich rolami
  const membersData = (server.members || []).map(memberId => {
    const user = db.findUserById(memberId);
    if (!user) return null;
    const { passwordHash: _, ...safe } = user;
    const userRoles = db.getMemberRoles(server, memberId);
    const highestRole = db.getMemberHighestRole(server, memberId);

    return {
      ...safe,
      roles: userRoles,
      highestRole
    };
  }).filter(Boolean);

  const currentUserPermissions = db.getUserPermissions(server, req.user.id);
  const roles = db.getServerRoles(server.id);

  res.json({
    server: {
      ...server,
      roles,
      currentUserPermissions,
      membersList: membersData
    }
  });
});

// Dodaj nowy kanał do serwera
router.post('/:id/channels', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_CHANNELS')) {
    return res.status(403).json({ error: 'Brak uprawnień do tworzenia kanałów (wymagana ranga z uprawnieniem Zarządzanie kanałami).' });
  }

  const { name, type, topic } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nazwa kanału jest wymagana.' });
  }

  const cleanName = type === 'voice' 
    ? (name.startsWith('🔊') ? name.trim() : `🔊 ${name.trim()}`)
    : name.trim().toLowerCase().replace(/\s+/g, '-');

  const newChannel = {
    id: `ch-${type || 'text'}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name: cleanName,
    type: type === 'voice' ? 'voice' : 'text',
    topic: topic ? topic.trim() : '',
    isPrivate: Boolean(req.body.isPrivate),
    allowedRoleIds: Array.isArray(req.body.allowedRoleIds) ? req.body.allowedRoleIds : [],
    allowSendRoleIds: Array.isArray(req.body.allowSendRoleIds) ? req.body.allowSendRoleIds : [],
    allowConnectRoleIds: Array.isArray(req.body.allowConnectRoleIds) ? req.body.allowConnectRoleIds : [],
    readOnly: Boolean(req.body.readOnly),
    hideFromUnauthorized: Boolean(req.body.hideFromUnauthorized)
  };

  db.addChannel(server.id, newChannel);
  res.status(201).json({ channel: newChannel });
});

// Edytuj kanał na serwerze (nazwa, temat, uprawnienia roli)
router.patch('/:id/channels/:channelId', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_CHANNELS')) {
    return res.status(403).json({ error: 'Brak uprawnień do edycji kanałów.' });
  }

  const { name, topic, isPrivate, allowedRoleIds, allowSendRoleIds, allowConnectRoleIds, readOnly, hideFromUnauthorized } = req.body;
  const updates = {};

  if (name && name.trim()) {
    const existing = server.channels.find(c => c.id === req.params.channelId);
    if (existing?.type === 'voice') {
      updates.name = name.startsWith('🔊') ? name.trim() : `🔊 ${name.trim()}`;
    } else {
      updates.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    }
  }

  if (topic !== undefined) updates.topic = topic.trim();
  if (isPrivate !== undefined) updates.isPrivate = Boolean(isPrivate);
  if (allowedRoleIds !== undefined) updates.allowedRoleIds = Array.isArray(allowedRoleIds) ? allowedRoleIds : [];
  if (allowSendRoleIds !== undefined) updates.allowSendRoleIds = Array.isArray(allowSendRoleIds) ? allowSendRoleIds : [];
  if (allowConnectRoleIds !== undefined) updates.allowConnectRoleIds = Array.isArray(allowConnectRoleIds) ? allowConnectRoleIds : [];
  if (readOnly !== undefined) updates.readOnly = Boolean(readOnly);
  if (hideFromUnauthorized !== undefined) updates.hideFromUnauthorized = Boolean(hideFromUnauthorized);

  const updatedChannel = db.updateChannel(server.id, req.params.channelId, updates);
  if (!updatedChannel) {
    return res.status(404).json({ error: 'Nie znaleziono kanału.' });
  }

  res.json({ channel: updatedChannel });
});

// Usuń kanał z serwera
router.delete('/:id/channels/:channelId', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_CHANNELS')) {
    return res.status(403).json({ error: 'Brak uprawnień do usuwania kanałów.' });
  }

  const deleted = db.deleteChannel(server.id, req.params.channelId);
  if (!deleted) {
    return res.status(404).json({ error: 'Nie znaleziono kanału do usunięcia.' });
  }

  res.json({ success: true, channelId: req.params.channelId });
});

// --- ROLE SERWERA ---
// Pobierz role serwera
router.get('/:id/roles', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }
  const roles = db.getServerRoles(server.id);
  res.json({ roles });
});

// Utwórz nową rolę na serwerze
router.post('/:id/roles', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_ROLES')) {
    return res.status(403).json({ error: 'Brak uprawnień do zarządzania rolami.' });
  }

  const newRole = db.addServerRole(server.id, req.body);
  res.status(201).json({ role: newRole });
});

// Edytuj rolę na serwerze
router.patch('/:id/roles/:roleId', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_ROLES')) {
    return res.status(403).json({ error: 'Brak uprawnień do zarządzania rolami.' });
  }

  const updatedRole = db.updateServerRole(server.id, req.params.roleId, req.body);
  if (!updatedRole) {
    return res.status(404).json({ error: 'Nie znaleziono roli.' });
  }

  res.json({ role: updatedRole });
});

// Usuń rolę z serwera
router.delete('/:id/roles/:roleId', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_ROLES')) {
    return res.status(403).json({ error: 'Brak uprawnień do zarządzania rolami.' });
  }

  const deleted = db.deleteServerRole(server.id, req.params.roleId);
  if (!deleted) {
    return res.status(400).json({ error: 'Nie można usunąć tej roli (jest to rola systemowa lub nie istnieje).' });
  }

  res.json({ success: true, roleId: req.params.roleId });
});

// Przypisz role do członka serwera
router.patch('/:id/members/:memberId/roles', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_ROLES')) {
    return res.status(403).json({ error: 'Brak uprawnień do nadawania ról.' });
  }

  const { roleIds } = req.body;
  const updatedRoleIds = db.setMemberRoles(server.id, req.params.memberId, roleIds);

  res.json({ success: true, memberId: req.params.memberId, roleIds: updatedRoleIds });
});

// Zmień kolejność ról (hierarchia)
router.put('/:id/roles/reorder', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_ROLES')) {
    return res.status(403).json({ error: 'Brak uprawnień do zmiany hierarchii ról.' });
  }

  const { roleIds } = req.body;
  if (!Array.isArray(roleIds)) {
    return res.status(400).json({ error: 'Wymagana tablica roleIds.' });
  }

  const updatedRoles = db.reorderServerRoles(server.id, roleIds);
  res.json({ roles: updatedRoles });
});

// Pobierz historię wiadomości na kanale
router.get('/channels/:channelId/messages', authenticateJWT, (req, res) => {
  const messages = db.getChannelMessages(req.params.channelId, 100);
  
  // Dołącz dane autorów wiadomości
  const enrichedMessages = messages.map(msg => {
    const user = db.findUserById(msg.userId);
    return {
      ...msg,
      user: user ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || user.avatar || user.avatarImage || null,
        avatarColor: user.avatarColor,
        avatarEmoji: user.avatarEmoji,
        status: user.status
      } : {
        id: msg.userId,
        username: 'Nieznany',
        displayName: 'Nieznany',
        avatarUrl: null,
        avatarColor: '#80848e',
        avatarEmoji: '❓',
        status: 'offline'
      }
    };
  });

  res.json({ messages: enrichedMessages });
});

// Usuń wiadomość z kanału tekstowego
router.delete('/channels/:channelId/messages/:messageId', authenticateJWT, (req, res) => {
  const { channelId, messageId } = req.params;
  const messages = db.data.messages || [];
  const msg = messages.find(m => m.id === messageId);

  if (!msg) {
    return res.status(404).json({ error: 'Wiadomość nie istnieje.' });
  }

  const server = db.getServerById(msg.serverId);
  const isAuthor = msg.userId === req.user.id;
  const canManage = server ? db.hasServerPermission(server, req.user.id, 'MANAGE_MESSAGES') : false;

  if (!isAuthor && !canManage) {
    return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej wiadomości.' });
  }

  const deleted = db.deleteMessage(messageId);
  res.json({ success: true, messageId, channelId });
});

// Edytuj dane serwera (właściciel lub MANAGE_SERVER)
router.patch('/:id', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (!db.hasServerPermission(server, req.user.id, 'MANAGE_SERVER')) {
    return res.status(403).json({ error: 'Brak uprawnień do edycji ustawień serwera.' });
  }

  const { name, description, icon, color, isPublic } = req.body;
  const updates = {};

  if (name && name.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (icon) updates.icon = icon;
  if (color) updates.color = color;
  if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);

  const updatedServer = db.updateServer(server.id, updates);
  res.json({ server: updatedServer });
});

// Opuść serwer
router.post('/:id/leave', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (server.ownerId === req.user.id) {
    return res.status(400).json({ error: 'Właściciel nie może opuścić własnego serwera. Możesz go usunąć.' });
  }

  db.removeServerMember(server.id, req.user.id);
  res.json({ success: true });
});

// Usuń serwer (tylko właściciel)
router.delete('/:id', authenticateJWT, (req, res) => {
  const server = db.getServerById(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Serwer nie istnieje.' });
  }

  if (server.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Brak uprawnień do usunięcia tego serwera.' });
  }

  db.deleteServer(server.id);
  res.json({ success: true });
});

export default router;
