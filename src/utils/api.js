const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('voicechat_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Wystąpił nieoczekiwany błąd');
  }

  return data;
}

export const api = {
  // Auth
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),

  // Users & Profile
  getAllUsers: () => request('/users'),
  getFriends: () => request('/users/friends'),
  updateProfile: (profileData) => request('/users/profile', { method: 'PATCH', body: JSON.stringify(profileData) }),

  // Servers
  getMyServers: () => request('/servers/my'),
  getExploreServers: () => request('/servers/explore'),
  getServer: (serverId) => request(`/servers/${serverId}`),
  createServer: (serverData) => request('/servers', { method: 'POST', body: JSON.stringify(serverData) }),
  updateServer: (serverId, updates) => request(`/servers/${serverId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  joinPublicServer: (serverId) => request(`/servers/${serverId}/join-public`, { method: 'POST' }),
  joinServerByInvite: (code) => request('/servers/join-invite', { method: 'POST', body: JSON.stringify({ code }) }),
  leaveServer: (serverId) => request(`/servers/${serverId}/leave`, { method: 'POST' }),
  deleteServer: (serverId) => request(`/servers/${serverId}`, { method: 'DELETE' }),
  createChannel: (serverId, channelData) => request(`/servers/${serverId}/channels`, { method: 'POST', body: JSON.stringify(channelData) }),
  editChannel: (serverId, channelId, updates) => request(`/servers/${serverId}/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteChannel: (serverId, channelId) => request(`/servers/${serverId}/channels/${channelId}`, { method: 'DELETE' }),
  getChannelMessages: (channelId) => request(`/servers/channels/${channelId}/messages`),

  // Direct Messages
  getConversations: () => request('/dm/conversations'),
  getDirectMessages: (recipientId) => request(`/dm/${recipientId}`)
};
