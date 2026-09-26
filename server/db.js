import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

  save() {
    this.saveData(this.data);
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
  getAllServers() {
    return this.data.servers;
  }

  getPublicServers() {
    return this.data.servers.filter(s => s.isPublic);
  }

  getServerById(id) {
    return this.data.servers.find(s => s.id === id);
  }

  getServerByInviteCode(code) {
    return this.data.servers.find(s => s.inviteCode.toUpperCase() === code.trim().toUpperCase());
  }

  createServer(server) {
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
    if (server && !server.members.includes(userId)) {
      server.members.push(userId);
      this.save();
    }
    return server;
  }

  removeServerMember(serverId, userId) {
    const server = this.getServerById(serverId);
    if (server) {
      server.members = server.members.filter(id => id !== userId);
      this.save();
    }
    return server;
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

  // --- Znajomi ---
  getFriendsForUser(userId) {
    const friends = [];
    for (const f of this.data.friendships) {
      if (f.status === 'accepted') {
        if (f.user1Id === userId) {
          const friend = this.findUserById(f.user2Id);
          if (friend) {
            const { passwordHash, ...safe } = friend;
            friends.push(safe);
          }
        } else if (f.user2Id === userId) {
          const friend = this.findUserById(f.user1Id);
          if (friend) {
            const { passwordHash, ...safe } = friend;
            friends.push(safe);
          }
        }
      }
    }
    return friends;
  }

  addFriendship(user1Id, user2Id) {
    const existing = this.data.friendships.find(f => 
      (f.user1Id === user1Id && f.user2Id === user2Id) ||
      (f.user1Id === user2Id && f.user2Id === user1Id)
    );
    if (existing) {
      existing.status = 'accepted';
    } else {
      this.data.friendships.push({
        user1Id,
        user2Id,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });
    }
    this.save();
  }
}

export const db = new JSONDatabase();
