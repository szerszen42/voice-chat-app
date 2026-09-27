import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Upewnij się, że katalog na dane istnieje
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultInitialData = {
  users: [],
  servers: [],
  messages: [],
  directMessages: [],
  friendships: []
};

class JSONDatabase {
  constructor() {
    this.data = this.load();
    this.mongoClient = null;
    this.mongoDb = null;
    this.mongoCollection = null;
    this.initMongo();
  }

  load() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.saveData(defaultInitialData);
        return JSON.parse(JSON.stringify(defaultInitialData));
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Błąd wczytywania bazy danych, inicjalizacja domyślnych danych:', err);
      return JSON.parse(JSON.stringify(defaultInitialData));
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Błąd zapisu bazy danych:', err);
    }
  }

  async initMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log('ℹ️ Brak MONGODB_URI – używam lokalnego pliku bazy danych (db.json)');
      return;
    }

    try {
      console.log('🔄 Łączenie z chmurową bazą danych MongoDB Atlas...');
      this.mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db('voicechat');
      this.mongoCollection = this.mongoDb.collection('app_state');

      // Wczytaj dane z chmury
      const remoteData = await this.mongoCollection.findOne({ _id: 'main_state' });
      if (remoteData && Array.isArray(remoteData.users) && remoteData.users.length > 0) {
        console.log(`✅ Połączono z MongoDB Atlas! Załadowano ${remoteData.users.length} użytkowników i ${remoteData.servers?.length || 0} serwerów.`);
        this.data = {
          users: remoteData.users || [],
          servers: remoteData.servers || [],
          messages: remoteData.messages || [],
          directMessages: remoteData.directMessages || [],
          friendships: remoteData.friendships || []
        };
        this.saveData(this.data);
      } else {
        console.log('ℹ️ Baza MongoDB jest nowa. Zapisuję stan początkowy do chmury...');
        await this.mongoCollection.updateOne(
          { _id: 'main_state' },
          { $set: this.data },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('⚠️ Błąd połączenia z MongoDB Atlas (używam pliku db.json):', err.message);
    }
  }

  save() {
    // 1. Zapis lokalny
    this.saveData(this.data);

    // 2. Zapis w chmurze MongoDB jeśli podłączone
    if (this.mongoCollection) {
      this.mongoCollection.updateOne(
        { _id: 'main_state' },
        { $set: this.data },
        { upsert: true }
      ).catch(err => {
        console.error('⚠️ Błąd zapisu do MongoDB Atlas:', err.message);
      });
    }
  }

  // --- Użytkownicy ---
  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserByUsername(username) {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  createUser(user) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  getAllUsers() {
    return this.data.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  // --- Serwery ---
  ensureServerRoles(server) {
    if (!server) return;
    let changed = false;
    if (!server.roles || !Array.isArray(server.roles) || server.roles.length === 0) {
      server.roles = [
        {
          id: 'role-owner',
          name: '👑 Właściciel',
          color: '#f1c40f',
          hoist: true,
          position: 1000,
          permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-admin',
          name: '🛡️ Administrator',
          color: '#ed4245',
          hoist: true,
          position: 500,
          permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-mod',
          name: '⭐ Moderator',
          color: '#2ecc71',
          hoist: true,
          position: 300,
          permissions: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#95a5a6',
          hoist: false,
          position: 0,
          permissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
        }
      ];
      changed = true;
    }

    if (!server.memberRoles || typeof server.memberRoles !== 'object') {
      server.memberRoles = {};
      changed = true;
    }

    if (server.ownerId) {
      if (!server.memberRoles[server.ownerId]) {
        server.memberRoles[server.ownerId] = ['role-owner'];
        changed = true;
      } else if (!server.memberRoles[server.ownerId].includes('role-owner')) {
        server.memberRoles[server.ownerId].unshift('role-owner');
        changed = true;
      }
    }

    if (changed) {
      this.save();
    }
  }

  getAllServers() {
    this.data.servers.forEach(s => this.ensureServerRoles(s));
    return this.data.servers;
  }

  getPublicServers() {
    this.data.servers.forEach(s => this.ensureServerRoles(s));
    return this.data.servers.filter(s => s.isPublic);
  }

  getServerById(id) {
    const server = this.data.servers.find(s => s.id === id);
    if (server) this.ensureServerRoles(server);
    return server;
  }

  getServerByInviteCode(code) {
    const server = this.data.servers.find(s => s.inviteCode && s.inviteCode.toUpperCase() === code.trim().toUpperCase());
    if (server) this.ensureServerRoles(server);
    return server;
  }

  createServer(server) {
    if (!server.roles || !Array.isArray(server.roles)) {
      server.roles = [
        {
          id: 'role-owner',
          name: '👑 Właściciel',
          color: '#f1c40f',
          hoist: true,
          position: 1000,
          permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-admin',
          name: '🛡️ Administrator',
          color: '#ed4245',
          hoist: true,
          position: 500,
          permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-mod',
          name: '⭐ Moderator',
          color: '#2ecc71',
          hoist: true,
          position: 300,
          permissions: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK']
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#95a5a6',
          hoist: false,
          position: 0,
          permissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
        }
      ];
    }
    if (!server.memberRoles) {
      server.memberRoles = {
        [server.ownerId]: ['role-owner']
      };
    }
    this.data.servers.push(server);
    this.save();
    return server;
  }

  updateServer(id, updates) {
    const server = this.getServerById(id);
    if (!server) return null;
    Object.assign(server, updates);
    this.save();
    return server;
  }

  deleteServer(id) {
    const index = this.data.servers.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.servers.splice(index, 1);
      // Usuń powiązane wiadomości
      this.data.messages = this.data.messages.filter(m => m.serverId !== id);
      this.save();
      return true;
    }
    return false;
  }

  addServerMember(serverId, userId) {
    const server = this.getServerById(serverId);
    if (server) {
      if (!server.members.includes(userId)) {
        server.members.push(userId);
      }
      if (!server.memberRoles[userId]) {
        server.memberRoles[userId] = ['role-everyone'];
      }
      this.save();
    }
    return server;
  }

  removeServerMember(serverId, userId) {
    const server = this.getServerById(serverId);
    if (server) {
      server.members = server.members.filter(id => id !== userId);
      if (server.memberRoles && server.memberRoles[userId]) {
        delete server.memberRoles[userId];
      }
      this.save();
    }
    return server;
  }

  // --- ZARZĄDZANIE ROLAMI I UPRAWNIENIAMI SERWERA ---
  getServerRoles(serverId) {
    const server = this.getServerById(serverId);
    if (!server) return [];
    return (server.roles || []).sort((a, b) => (b.position || 0) - (a.position || 0));
  }

  addServerRole(serverId, roleData) {
    const server = this.getServerById(serverId);
    if (!server) return null;

    const maxPosition = (server.roles || []).reduce((max, r) => Math.max(max, r.position || 0), 0);
    const newRole = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: roleData.name ? roleData.name.trim() : 'Nowa rola',
      color: roleData.color || '#99aab5',
      hoist: Boolean(roleData.hoist),
      position: roleData.position !== undefined ? roleData.position : Math.max(1, maxPosition),
      permissions: Array.isArray(roleData.permissions) ? roleData.permissions : ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
    };

    server.roles.push(newRole);
    this.save();
    return newRole;
  }

  updateServerRole(serverId, roleId, updates) {
    const server = this.getServerById(serverId);
    if (!server) return null;

    const role = (server.roles || []).find(r => r.id === roleId);
    if (!role) return null;

    if (updates.name !== undefined && updates.name.trim()) role.name = updates.name.trim();
    if (updates.color !== undefined) role.color = updates.color;
    if (updates.hoist !== undefined) role.hoist = Boolean(updates.hoist);
    if (updates.position !== undefined) role.position = Number(updates.position);
    if (Array.isArray(updates.permissions)) role.permissions = updates.permissions;

    this.save();
    return role;
  }

  deleteServerRole(serverId, roleId) {
    const server = this.getServerById(serverId);
    if (!server) return false;

    // Nie usuwaj ról systemowych
    if (roleId === 'role-owner' || roleId === 'role-everyone') {
      return false;
    }

    const index = (server.roles || []).findIndex(r => r.id === roleId);
    if (index === -1) return false;

    server.roles.splice(index, 1);

    // Usuń tę rolę ze wszystkich członków
    if (server.memberRoles) {
      Object.keys(server.memberRoles).forEach(memberId => {
        if (Array.isArray(server.memberRoles[memberId])) {
          server.memberRoles[memberId] = server.memberRoles[memberId].filter(id => id !== roleId);
        }
      });
    }

    this.save();
    return true;
  }

  reorderServerRoles(serverId, roleIdsOrdered) {
    const server = this.getServerById(serverId);
    if (!server || !Array.isArray(roleIdsOrdered)) return null;

    this.ensureServerRoles(server);

    const total = roleIdsOrdered.length;
    server.roles.forEach(role => {
      const idx = roleIdsOrdered.indexOf(role.id);
      if (idx !== -1) {
        role.position = (total - idx) * 10;
      }
    });

    const ownerRole = server.roles.find(r => r.id === 'role-owner');
    if (ownerRole) ownerRole.position = 1000;

    const everyoneRole = server.roles.find(r => r.id === 'role-everyone');
    if (everyoneRole) everyoneRole.position = 0;

    server.roles.sort((a, b) => (b.position || 0) - (a.position || 0));
    this.save();
    return server.roles;
  }

  setMemberRoles(serverId, memberId, roleIds) {
    const server = this.getServerById(serverId);
    if (!server) return null;

    if (!server.memberRoles) server.memberRoles = {};
    
    // Upewnij się, że właściciel ma role-owner
    let finalRoleIds = Array.isArray(roleIds) ? [...roleIds] : [];
    if (server.ownerId === memberId && !finalRoleIds.includes('role-owner')) {
      finalRoleIds.unshift('role-owner');
    }

    server.memberRoles[memberId] = finalRoleIds;
    this.save();
    return finalRoleIds;
  }

  getMemberRoles(server, userId) {
    if (!server) return [];
    this.ensureServerRoles(server);

    const assignedRoleIds = (server.memberRoles && server.memberRoles[userId]) || [];
    const rolesList = [];

    // Jeśli właściciel
    if (server.ownerId === userId) {
      const ownerRole = server.roles.find(r => r.id === 'role-owner') || {
        id: 'role-owner',
        name: '👑 Właściciel',
        color: '#f1c40f',
        hoist: true,
        position: 100,
        permissions: ['ADMINISTRATOR']
      };
      if (!rolesList.some(r => r.id === 'role-owner')) {
        rolesList.push(ownerRole);
      }
    }

    // Dodaj przypisane role
    assignedRoleIds.forEach(roleId => {
      const found = server.roles.find(r => r.id === roleId);
      if (found && !rolesList.some(r => r.id === found.id)) {
        rolesList.push(found);
      }
    });

    // Zawsze dołącz @everyone
    const everyoneRole = server.roles.find(r => r.id === 'role-everyone');
    if (everyoneRole && !rolesList.some(r => r.id === 'role-everyone')) {
      rolesList.push(everyoneRole);
    }

    return rolesList.sort((a, b) => (b.position || 0) - (a.position || 0));
  }

  getMemberHighestRole(server, userId) {
    const roles = this.getMemberRoles(server, userId);
    // Preferuj role z hoist = true, a jeśli brak, najwyższą po pozycji
    const hoisted = roles.filter(r => r.hoist && r.id !== 'role-everyone');
    if (hoisted.length > 0) {
      return hoisted[0];
    }
    return roles.length > 0 ? roles[0] : null;
  }

  getUserPermissions(server, userId) {
    if (!server) return [];
    if (server.ownerId === userId) {
      return ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK'];
    }

    const roles = this.getMemberRoles(server, userId);
    const permissionsSet = new Set();

    for (const role of roles) {
      if (Array.isArray(role.permissions)) {
        role.permissions.forEach(p => permissionsSet.add(p));
      }
    }

    if (permissionsSet.has('ADMINISTRATOR')) {
      return ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'SEND_MESSAGES', 'CONNECT', 'SPEAK'];
    }

    return Array.from(permissionsSet);
  }

  hasServerPermission(server, userId, permission) {
    if (!server || !userId) return false;
    if (server.ownerId === userId) return true;
    const permissions = this.getUserPermissions(server, userId);
    return permissions.includes('ADMINISTRATOR') || permissions.includes(permission);
  }

  addChannel(serverId, channel) {
    const server = this.getServerById(serverId);
    if (server) {
      server.channels.push(channel);
      this.save();
      return channel;
    }
    return null;
  }

  updateChannel(serverId, channelId, updates) {
    const server = this.getServerById(serverId);
    if (server) {
      const channel = server.channels.find(c => c.id === channelId);
      if (channel) {
        Object.assign(channel, updates);
        this.save();
        return channel;
      }
    }
    return null;
  }

  deleteChannel(serverId, channelId) {
    const server = this.getServerById(serverId);
    if (server) {
      server.channels = server.channels.filter(c => c.id !== channelId);
      this.data.messages = this.data.messages.filter(m => m.channelId !== channelId);
      this.save();
      return true;
    }
    return false;
  }

  // --- Wiadomości na kanałach ---
  getChannelMessages(channelId, limit = 100) {
    return this.data.messages
      .filter(m => m.channelId === channelId)
      .slice(-limit);
  }

  addMessage(msg) {
    this.data.messages.push(msg);
    this.save();
    return msg;
  }

  deleteMessage(messageId) {
    const idx = this.data.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      const [deleted] = this.data.messages.splice(idx, 1);
      this.save();
      return deleted;
    }
    return null;
  }

  // --- Wiadomości Prywatne (PV / DM) ---
  getDirectMessagesBetween(userAId, userBId, limit = 100) {
    return this.data.directMessages
      .filter(dm => 
        (dm.senderId === userAId && dm.recipientId === userBId) ||
        (dm.senderId === userBId && dm.recipientId === userAId)
      )
      .slice(-limit);
  }

  addDirectMessage(dm) {
    this.data.directMessages.push(dm);
    this.save();
    return dm;
  }

  deleteDirectMessage(messageId) {
    const idx = this.data.directMessages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      const [deleted] = this.data.directMessages.splice(idx, 1);
      this.save();
      return deleted;
    }
    return null;
  }

  // --- Znajomi i Zaproszenia do znajomych (Discord-style) ---
  getFriendsForUser(userId) {
    const friends = [];
    if (!this.data.friendships) this.data.friendships = [];
    for (const f of this.data.friendships) {
      if (f.status === 'accepted') {
        const friendId = f.user1Id === userId ? f.user2Id : (f.user2Id === userId ? f.user1Id : null);
        if (friendId) {
          const friend = this.findUserById(friendId);
          if (friend) {
            const { passwordHash, ...safe } = friend;
            friends.push(safe);
          }
        }
      }
    }
    return friends;
  }

  getPendingRequestsForUser(userId) {
    if (!this.data.friendships) this.data.friendships = [];
    const incoming = [];
    const outgoing = [];

    for (const f of this.data.friendships) {
      if (f.status === 'pending') {
        const senderId = f.requesterId || f.user1Id;
        const recipientId = (f.user1Id === senderId) ? f.user2Id : f.user1Id;

        if (recipientId === userId) {
          const senderUser = this.findUserById(senderId);
          if (senderUser) {
            const { passwordHash, ...safe } = senderUser;
            incoming.push({
              id: f.id || `${f.user1Id}-${f.user2Id}`,
              senderId,
              user: safe,
              createdAt: f.createdAt
            });
          }
        } else if (senderId === userId) {
          const recipientUser = this.findUserById(recipientId);
          if (recipientUser) {
            const { passwordHash, ...safe } = recipientUser;
            outgoing.push({
              id: f.id || `${f.user1Id}-${f.user2Id}`,
              recipientId,
              user: safe,
              createdAt: f.createdAt
            });
          }
        }
      }
    }
    return { incoming, outgoing };
  }

  sendFriendRequest(requesterId, targetQuery) {
    if (!this.data.friendships) this.data.friendships = [];
    const cleanQuery = targetQuery.trim().toLowerCase().replace(/^@/, '');

    const targetUser = this.data.users.find(u => 
      u.username.toLowerCase() === cleanQuery ||
      (u.email && u.email.toLowerCase() === cleanQuery) ||
      u.id === cleanQuery
    );

    if (!targetUser) {
      return { error: 'Nie znaleziono użytkownika o takiej nazwie. Upewnij się, że nick jest poprawny!' };
    }

    if (targetUser.id === requesterId) {
      return { error: 'Nie możesz wysłać zaproszenia do samego siebie!' };
    }

    const existing = this.data.friendships.find(f => 
      (f.user1Id === requesterId && f.user2Id === targetUser.id) ||
      (f.user1Id === targetUser.id && f.user2Id === requesterId)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: `Użytkownik ${targetUser.displayName || targetUser.username} jest już Twoim znajomym!` };
      }
      if (existing.status === 'pending') {
        const originalRequester = existing.requesterId || existing.user1Id;
        if (originalRequester === requesterId) {
          return { error: 'Wysłałeś już zaproszenie do tego użytkownika. Oczekuje na akceptację!' };
        } else {
          // Druga osoba też wysłała - automatycznie akceptujemy!
          existing.status = 'accepted';
          this.save();
          const { passwordHash, ...safeTarget } = targetUser;
          return { success: true, autoAccepted: true, friend: safeTarget };
        }
      }
    }

    const newRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user1Id: requesterId,
      user2Id: targetUser.id,
      requesterId: requesterId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.data.friendships.push(newRequest);
    this.save();

    const { passwordHash, ...safeTarget } = targetUser;
    return { success: true, request: newRequest, targetUser: safeTarget };
  }

  acceptFriendRequest(userId, senderIdOrRequestId) {
    if (!this.data.friendships) this.data.friendships = [];
    const friendship = this.data.friendships.find(f => 
      f.id === senderIdOrRequestId ||
      ((f.user1Id === userId && f.user2Id === senderIdOrRequestId) || (f.user2Id === userId && f.user1Id === senderIdOrRequestId))
    );

    if (!friendship) {
      return { error: 'Nie znaleziono takiego zaproszenia.' };
    }

    friendship.status = 'accepted';
    this.save();

    const friendId = friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id;
    const friend = this.findUserById(friendId);
    const safeFriend = friend ? (({ passwordHash, ...rest }) => rest)(friend) : null;

    return { success: true, friend: safeFriend, friendId };
  }

  declineOrCancelFriendRequest(userId, targetIdOrRequestId) {
    if (!this.data.friendships) this.data.friendships = [];
    const index = this.data.friendships.findIndex(f => 
      f.id === targetIdOrRequestId ||
      ((f.user1Id === userId && f.user2Id === targetIdOrRequestId) || (f.user2Id === userId && f.user1Id === targetIdOrRequestId))
    );

    if (index !== -1) {
      const removed = this.data.friendships.splice(index, 1)[0];
      this.save();
      const otherUserId = removed.user1Id === userId ? removed.user2Id : removed.user1Id;
      return { success: true, otherUserId };
    }
    return { error: 'Nie znaleziono zaproszenia do usunięcia.' };
  }

  removeFriend(userId, friendId) {
    if (!this.data.friendships) this.data.friendships = [];
    const index = this.data.friendships.findIndex(f => 
      ((f.user1Id === userId && f.user2Id === friendId) || (f.user1Id === friendId && f.user2Id === userId)) &&
      f.status === 'accepted'
    );

    if (index !== -1) {
      this.data.friendships.splice(index, 1);
      this.save();
      return { success: true };
    }
    return { error: 'Nie znaleziono takiego znajomego.' };
  }

  addFriendship(user1Id, user2Id) {
    if (!this.data.friendships) this.data.friendships = [];
    const existing = this.data.friendships.find(f => 
      (f.user1Id === user1Id && f.user2Id === user2Id) ||
      (f.user1Id === user2Id && f.user2Id === user1Id)
    );
    if (existing) {
      existing.status = 'accepted';
    } else {
      this.data.friendships.push({
        id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user1Id,
        user2Id,
        requesterId: user1Id,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });
    }
    this.save();
  }

  // --- Wspólne serwery i Wspólni znajomi (Discord-style User Profile) ---
  getMutualServers(userAId, userBId) {
    if (!this.data.servers) return [];
    return this.data.servers
      .filter(s => Array.isArray(s.members) && s.members.includes(userAId) && s.members.includes(userBId))
      .map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        description: s.description,
        membersCount: s.members.length
      }));
  }

  getMutualFriends(userAId, userBId) {
    if (userAId === userBId) return [];
    const friendsA = this.getFriendsForUser(userAId);
    const friendsB = this.getFriendsForUser(userBId);
    const friendBIds = new Set(friendsB.map(f => f.id));
    return friendsA.filter(f => friendBIds.has(f.id));
  }

  getFriendshipRelation(userAId, userBId) {
    if (userAId === userBId) return 'self';
    if (!this.data.friendships) return 'none';
    const f = this.data.friendships.find(rel =>
      (rel.user1Id === userAId && rel.user2Id === userBId) ||
      (rel.user1Id === userBId && rel.user2Id === userAId)
    );
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    if (f.status === 'pending') {
      const requester = f.requesterId || f.user1Id;
      return requester === userAId ? 'pending_outgoing' : 'pending_incoming';
    }
    return 'none';
  }
}

export const db = new JSONDatabase();
