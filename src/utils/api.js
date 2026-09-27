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
  getUserProfile: (userId) => request(`/users/${userId}/profile`),
  sendFriendRequest: (username) => request('/users/friends/request', { method: 'POST', body: JSON.stringify({ username }) }),
  acceptFriendRequest: (senderId, requestId) => request('/users/friends/accept', { method: 'POST', body: JSON.stringify({ senderId, requestId }) }),
  declineFriendRequest: (senderId, requestId) => request('/users/friends/decline', { method: 'POST', body: JSON.stringify({ senderId, requestId }) }),
  removeFriend: (friendId) => request(`/users/friends/${friendId}`, { method: 'DELETE' }),
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

  // Server Roles
  getServerRoles: (serverId) => request(`/servers/${serverId}/roles`),
  createServerRole: (serverId, roleData) => request(`/servers/${serverId}/roles`, { method: 'POST', body: JSON.stringify(roleData) }),
  updateServerRole: (serverId, roleId, updates) => request(`/servers/${serverId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteServerRole: (serverId, roleId) => request(`/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' }),
  reorderServerRoles: (serverId, roleIds) => request(`/servers/${serverId}/roles/reorder`, { method: 'PUT', body: JSON.stringify({ roleIds }) }),
  setMemberRoles: (serverId, memberId, roleIds) => request(`/servers/${serverId}/members/${memberId}/roles`, { method: 'PATCH', body: JSON.stringify({ roleIds }) }),

  // Messages
  deleteChannelMessage: (channelId, messageId) => request(`/servers/channels/${channelId}/messages/${messageId}`, { method: 'DELETE' }),

  // Direct Messages
  getConversations: () => request('/dm/conversations'),
  getDirectMessages: (recipientId) => request(`/dm/${recipientId}`)
};
