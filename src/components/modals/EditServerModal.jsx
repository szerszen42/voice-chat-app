import React, { useState, useEffect } from 'react';
import { 
  X, Globe, Lock, Shield, Settings, Users, Plus, Trash2, Check, Search, 
  ChevronRight, Hash, Volume2, Edit2, AlertTriangle, Sparkles, ArrowUp, ArrowDown 
} from 'lucide-react';
import { api } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { UserAvatar } from '../common/UserAvatar';

const AVAILABLE_PERMISSIONS = [
  {
    id: 'ADMINISTRATOR',
    name: '👑 Administrator',
    description: 'Przyznaje wszystkie uprawnienia. Użytkownicy z tą rolą mogą zarządzać całym serwerem.'
  },
  {
    id: 'MANAGE_SERVER',
    name: '⚙️ Zarządzanie serwerem',
    description: 'Umożliwia zmianę nazwy serwera, opisu, ikony i widoczności.'
  },
  {
    id: 'MANAGE_ROLES',
    name: '🛡️ Zarządzanie rolami',
    description: 'Umożliwia tworzenie, edycję, zmianę hierarchii i usuwanie ról.'
  },
  {
    id: 'MANAGE_CHANNELS',
    name: '💬 Zarządzanie kanałami',
    description: 'Umożliwia dodawanie, edycję, ustawianie uprawnień oraz usuwanie kanałów.'
  },
  {
    id: 'MANAGE_MESSAGES',
    name: '🗑️ Zarządzanie wiadomościami',
    description: 'Umożliwia usuwanie wiadomości innych użytkowników na czacie serwera.'
  },
  {
    id: 'MOVE_MEMBERS',
    name: '➡️ Przenoszenie członków',
    description: 'Umożliwia przerzucanie użytkowników między kanałami głosowymi.'
  },
  {
    id: 'MUTE_MEMBERS',
    name: '🔇 Wyciszanie członków',
    description: 'Umożliwia wyciszanie innych użytkowników na kanałach głosowych.'
  },
  {
    id: 'SEND_MESSAGES',
    name: '✉️ Wysyłanie wiadomości',
    description: 'Umożliwia pisanie i wysyłanie wiadomości na kanałach tekstowych.'
  },
  {
    id: 'CONNECT',
    name: '🔊 Łączenie z głosem',
    description: 'Umożliwia dołączanie do kanałów głosowych.'
  },
  {
    id: 'SPEAK',
    name: '🎙️ Mówienie na głosie',
    description: 'Umożliwia mówienie i transmisję głosu na kanałach głosowych.'
  }
];

const PRESET_ROLE_COLORS = [
  '#99aab5', '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63',
  '#f1c40f', '#e67e22', '#e74c3c', '#5865f2', '#eb459e', '#57f287'
];

export const EditServerModal = ({ 
  isOpen, 
  onClose, 
  server, 
  onSave, 
  onRefreshServer,
  onDeleteServer 
}) => {
  const { socket } = useSocket();

  // Aktywna zakładka: 'general' | 'roles' | 'channels' | 'members' | 'delete'
  const [activeTab, setActiveTab] = useState('general');

  // Stan ustawień ogólnych
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💬');
  const [color, setColor] = useState('#5865f2');
  const [isPublic, setIsPublic] = useState(true);

  // Stan ról
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    color: '#99aab5',
    hoist: true,
    permissions: []
  });

  // Stan kanałów
  const [channels, setChannels] = useState([]);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannelForm, setNewChannelForm] = useState({ 
    name: '', 
    type: 'text',
    isPrivate: false,
    readOnly: false,
    allowedRoleIds: []
  });
  const [showAddChannelForm, setShowAddChannelForm] = useState(false);

  // Stan członków
  const [members, setMembers] = useState([]);
  const [memberRolesMap, setMemberRolesMap] = useState({});
  const [memberSearch, setMemberSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (server && isOpen) {
      setName(server.name || '');
      setDescription(server.description || '');
      setIcon(server.icon || '💬');
      setColor(server.color || '#5865f2');
      setIsPublic(Boolean(server.isPublic));

      const serverRoles = server.roles ? [...server.roles].sort((a, b) => (b.position || 0) - (a.position || 0)) : [];
      setRoles(serverRoles);
      if (serverRoles.length > 0) {
        setSelectedRoleId(serverRoles[0].id);
        setRoleForm({
          name: serverRoles[0].name || '',
          color: serverRoles[0].color || '#99aab5',
          hoist: Boolean(serverRoles[0].hoist),
          permissions: serverRoles[0].permissions || []
        });
      }

      setChannels(server.channels || []);
      setMembers(server.membersList || []);
      setMemberRolesMap(server.memberRoles || {});
      setError('');
      setSuccessMsg('');
    }
  }, [server, isOpen]);

  if (!isOpen || !server) return null;

  const emojiOptions = ['💬', '🎮', '🚀', '🎧', '⚡', '🔥', '🛡️', '🕹️', '👑', '🌍', '🐱', '🍕'];
  const colorOptions = ['#5865f2', '#23a55a', '#eb459e', '#f0b232', '#9b59b6', '#00b0f4', '#e67e22', '#111214'];

  // Zapis ustawień ogólnych
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Wpisz nazwę serwera.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await onSave(server.id, {
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        isPublic
      });
      setSuccessMsg('Zapisano ustawienia ogólne serwera!');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
    } catch (err) {
      setError(err.message || 'Nie udało się zaktualizować serwera.');
    } finally {
      setLoading(false);
    }
  };

  // --- OBSŁUGA RÓL ---
  const handleSelectRole = (role) => {
    setSelectedRoleId(role.id);
    setRoleForm({
      name: role.name || '',
      color: role.color || '#99aab5',
      hoist: Boolean(role.hoist),
      permissions: role.permissions || []
    });
    setError('');
    setSuccessMsg('');
  };

  const handleCreateRole = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.createServerRole(server.id, {
        name: 'Nowa rola',
        color: '#99aab5',
        hoist: true,
        permissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
      });
      const newRole = res.role;
      const updatedRoles = [...roles, newRole].sort((a, b) => (b.position || 0) - (a.position || 0));
      setRoles(updatedRoles);
      handleSelectRole(newRole);
      setSuccessMsg('Utworzono nową rolę!');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się utworzyć roli.');
    } finally {
      setLoading(false);
    }
  };

  // Przesuwanie roli w górę / w dół (Hierarchia)
  const handleMoveRole = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roles.length) return;

    const movingRole = roles[index];
    const targetRole = roles[targetIndex];

    // Zabezpieczenie: Właściciel zawsze na samej górze, @everyone na samym dole
    if (movingRole.id === 'role-owner' || targetRole.id === 'role-owner') return;
    if (movingRole.id === 'role-everyone' || targetRole.id === 'role-everyone') return;

    const newRoles = [...roles];
    newRoles[index] = targetRole;
    newRoles[targetIndex] = movingRole;

    setRoles(newRoles);

    try {
      const roleIds = newRoles.map(r => r.id);
      await api.reorderServerRoles(server.id, roleIds);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się zmienić hierarchii ról.');
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    if (!roleForm.name.trim()) {
      setError('Nazwa roli nie może być pusta.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.updateServerRole(server.id, selectedRoleId, roleForm);
      const updatedRole = res.role;
      const updatedRoles = roles.map(r => r.id === selectedRoleId ? updatedRole : r);
      setRoles(updatedRoles);
      setSuccessMsg(`Zapisano rolę "${updatedRole.name}"!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się zapisać roli.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Czy na pewno chcesz usunąć tę rolę? Zostanie ona odebrana wszystkim członkom.')) return;

    setLoading(true);
    setError('');
    try {
      await api.deleteServerRole(server.id, roleId);
      const remaining = roles.filter(r => r.id !== roleId);
      setRoles(remaining);
      if (remaining.length > 0) {
        handleSelectRole(remaining[0]);
      } else {
        setSelectedRoleId(null);
      }
      setSuccessMsg('Usunięto rolę.');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się usunąć roli.');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permId) => {
    setRoleForm(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter(p => p !== permId)
          : [...prev.permissions, permId]
      };
    });
  };

  // --- OBSŁUGA CZŁONKÓW ---
  const toggleMemberRole = async (memberId, roleId) => {
    const currentMemberRoles = memberRolesMap[memberId] || [];
    const hasRole = currentMemberRoles.includes(roleId);

    const nextRoles = hasRole
      ? currentMemberRoles.filter(id => id !== roleId)
      : [...currentMemberRoles, roleId];

    try {
      await api.setMemberRoles(server.id, memberId, nextRoles);
      setMemberRolesMap(prev => ({
        ...prev,
        [memberId]: nextRoles
      }));
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      alert(err.message || 'Nie udało się zaktualizować ról członka.');
    }
  };

  // --- OBSŁUGA KANAŁÓW W USTAWIENIACH ---
  const handleCreateChannelInside = async (e) => {
    e.preventDefault();
    if (!newChannelForm.name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.createChannel(server.id, {
        name: newChannelForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
        type: newChannelForm.type,
        isPrivate: newChannelForm.isPrivate,
        readOnly: newChannelForm.readOnly,
        allowedRoleIds: newChannelForm.allowedRoleIds
      });
      setChannels(res.channels || []);
      setNewChannelForm({ name: '', type: 'text', isPrivate: false, readOnly: false, allowedRoleIds: [] });
      setShowAddChannelForm(false);
      setSuccessMsg('Utworzono kanał!');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się utworzyć kanału.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannelInside = async (channelId, updates) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.editChannel(server.id, channelId, updates);
      setChannels(res.channels || []);
      setEditingChannel(null);
      setSuccessMsg('Zaktualizowano kanał!');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się zaktualizować kanału.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannelInside = async (channelId, channelName) => {
    if (!confirm(`Czy na pewno chcesz usunąć kanał "${channelName}"?`)) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.deleteChannel(server.id, channelId);
      setChannels(res.channels || []);
      setSuccessMsg('Usunięto kanał.');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      setError(err.message || 'Nie udało się usunąć kanału.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    return (m.displayName || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isSystemRole = selectedRoleId === 'role-owner' || selectedRoleId === 'role-everyone';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-4xl h-[90vh] max-h-[720px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative text-dark-100">
        
        {/* Nagłówek okna */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between bg-dark-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow" style={{ backgroundColor: color }}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight flex items-center space-x-2">
                <span>{server.name}</span>
                <span className="text-xs px-2 py-0.5 bg-dark-700 text-dark-300 rounded font-normal">Ustawienia serwera</span>
              </h2>
              <span className="text-xs text-dark-400">Dostosuj hierarchię ról, uprawnienia kanałów i członków</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ciało okna: Lewy pasek nawigacji + Prawa zawartość */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          
          {/* LEWY PASEK ZAKŁADEK W STYLU DISCORDA */}
          <div className="w-full sm:w-56 bg-dark-850/80 p-3 border-r border-dark-700/80 flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible flex-shrink-0">
            <div className="hidden sm:block px-3 py-1.5 text-[11px] font-bold text-dark-400 uppercase tracking-wider">
              Ustawienia
            </div>
            
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <Settings size={16} />
              <span>Przegląd serwera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Shield size={16} />
                <span>Role i uprawnienia</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 bg-dark-900/60 rounded-full font-bold">
                {roles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('channels')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'channels'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Hash size={16} />
                <span>Kanały serwera</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 bg-dark-900/60 rounded-full font-bold">
                {channels.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users size={16} />
                <span>Zarządzanie członkami</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 bg-dark-900/60 rounded-full font-bold">
                {members.length}
              </span>
            </button>

            {onDeleteServer && (
              <>
                <div className="hidden sm:block my-2 h-[1px] bg-dark-700/60" />
                <button
                  type="button"
                  onClick={() => setActiveTab('delete')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'delete'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                  }`}
                >
                  <Trash2 size={16} />
                  <span>Usuń serwer</span>
                </button>
              </>
            )}
          </div>

          {/* PRAWA ZAWARTOSC AKTYWNEJ ZAKŁADKI */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark-800 scrollbar-thin">
            
            {/* Powiadomienia o błędzie / sukcesie */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 animate-fade-in flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')}><X size={14} /></button>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 animate-fade-in flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Check size={14} />
                  <span>{successMsg}</span>
                </span>
                <button onClick={() => setSuccessMsg('')}><X size={14} /></button>
              </div>
            )}

            {/* 1. ZAKŁADKA: PRZEGLĄD (GENERAL) */}
            {activeTab === 'general' && (
              <form onSubmit={handleSaveGeneral} className="space-y-5 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Przegląd serwera</h3>
                  <p className="text-xs text-dark-400">Dostosuj podstawowe dane widoczne dla wszystkich członków.</p>
                </div>

                {/* Ikona i Kolor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-300 mb-1.5">
                      Ikona serwera
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-dark-900/60 rounded-xl border border-dark-700">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setIcon(emoji)}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                            icon === emoji
                              ? 'bg-brand-500 text-white scale-110 shadow'
                              : 'hover:bg-dark-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-300 mb-1.5">
                      Kolor przewodni
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-dark-900/60 rounded-xl border border-dark-700">
                      {colorOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                            color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {color === c && <Check size={14} className="text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nazwa */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-300 mb-1.5">
                    Nazwa serwera *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Moja Ekipa"
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Opis */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-300 mb-1.5">
                    Opis serwera
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Krótki opis o czym jest ten serwer..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                {/* Widoczność serwera */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-300 mb-2">
                    Widoczność w katalogu
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left ${
                        isPublic
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                      }`}
                    >
                      <Globe size={18} className={isPublic ? 'text-brand-400' : 'text-dark-500'} />
                      <div>
                        <div className="text-xs font-bold">Publiczny</div>
                        <div className="text-[10px] text-dark-400">Widoczny w eksploratorze serwerów</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left ${
                        !isPublic
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                      }`}
                    >
                      <Lock size={18} className={!isPublic ? 'text-amber-400' : 'text-dark-500'} />
                      <div>
                        <div className="text-xs font-bold">Prywatny</div>
                        <div className="text-[10px] text-dark-400">Tylko na bezpośrednie zaproszenie</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-dark-700 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center space-x-2"
                  >
                    <span>{loading ? 'Zapisywanie...' : 'Zapisz zmiany'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. ZAKŁADKA: ROLE I UPRAWNIENIA (ROLES) */}
            {activeTab === 'roles' && (
              <div className="flex flex-col md:flex-row gap-4 h-full">
                
                {/* Lewa kolumna: Lista ról wraz z przyciskami hierarchii (⬆️ / ⬇️) */}
                <div className="w-full md:w-64 bg-dark-900/60 border border-dark-700 rounded-xl p-2.5 flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-800">
                    <div>
                      <span className="text-xs font-bold text-dark-300 uppercase tracking-wider block">Hierarchia Ról</span>
                      <span className="text-[10px] text-dark-400">Użyj strzałek ⬆️⬇️ aby zmienić kolejność</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateRole}
                      className="px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-transform active:scale-95 flex-shrink-0"
                    >
                      <Plus size={13} />
                      <span>Dodaj</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
                    {roles.map((r, rIdx) => {
                      const isSelected = r.id === selectedRoleId;
                      const isOwnerRole = r.id === 'role-owner';
                      const isEveryoneRole = r.id === 'role-everyone';
                      const canMoveUp = rIdx > 1; // nie można wyżej niż owner na indeksie 0
                      const canMoveDown = rIdx < roles.length - 2; // nie można niżej niż @everyone

                      return (
                        <div
                          key={r.id}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-all group ${
                            isSelected
                              ? 'bg-dark-700 text-white border-l-4 border-brand-500 shadow'
                              : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                          }`}
                        >
                          <div
                            onClick={() => handleSelectRole(r)}
                            className="flex items-center space-x-2 truncate flex-1 cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color || '#99aab5' }} />
                            <span className="truncate">{r.name}</span>
                            {isOwnerRole && <span className="text-[10px]">👑</span>}
                          </div>

                          {/* Przyciski przesuwania hierarchii */}
                          {!isOwnerRole && !isEveryoneRole && (
                            <div className="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 flex-shrink-0">
                              <button
                                type="button"
                                disabled={!canMoveUp}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveRole(rIdx, 'up');
                                }}
                                className={`p-1 rounded hover:bg-dark-600 text-dark-300 hover:text-white transition-colors ${!canMoveUp ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                title="Przesuń rolę w górę (wyższy priorytet)"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={!canMoveDown}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveRole(rIdx, 'down');
                                }}
                                className={`p-1 rounded hover:bg-dark-600 text-dark-300 hover:text-white transition-colors ${!canMoveDown ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                title="Przesuń rolę w dół (niższy priorytet)"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Prawa kolumna: Konfiguracja wybranej roli */}
                {selectedRole ? (
                  <div className="flex-1 bg-dark-900/60 border border-dark-700 rounded-xl p-4 overflow-y-auto space-y-4 scrollbar-thin">
                    <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                      <div>
                        <h4 className="text-xs font-bold text-white">Edycja roli: {roleForm.name}</h4>
                        <span className="text-[10px] text-dark-400">Dostosuj nazwę, kolor, grupowanie oraz uprawnienia</span>
                      </div>
                      {!isSystemRole && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(selectedRole.id)}
                          className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Usuń rolę</span>
                        </button>
                      )}
                    </div>

                    {/* Nazwa i Kolor roli */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-dark-400 mb-1">
                          Nazwa roli
                        </label>
                        <input
                          type="text"
                          value={roleForm.name}
                          onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                          className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-dark-400 mb-1">
                          Kolor roli
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={roleForm.color}
                            onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                            className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <div className="flex flex-wrap gap-1">
                            {PRESET_ROLE_COLORS.slice(0, 7).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setRoleForm({ ...roleForm, color: c })}
                                className="w-5 h-5 rounded-full border border-dark-700"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Przełącznik Grupowania na liście (Hoist) */}
                    <div 
                      onClick={() => setRoleForm({ ...roleForm, hoist: !roleForm.hoist })}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                        roleForm.hoist
                          ? 'border-brand-500/60 bg-brand-500/10 text-white'
                          : 'border-dark-800 bg-dark-950/60 text-dark-300 hover:border-dark-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">Wyświetlaj tę rolę oddzielnie na liście członków</div>
                        <div className="text-[10px] text-dark-400 mt-0.5">Tworzy osobną kategorię z nazwą i kolorem roli po prawej stronie czatu</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={roleForm.hoist}
                        onChange={() => {}}
                        className="rounded text-brand-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Uprawnienia */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-dark-400 mb-2">
                        Uprawnienia dla tej roli ({roleForm.permissions.length}/{AVAILABLE_PERMISSIONS.length})
                      </label>
                      <div className="space-y-2">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                          const isChecked = roleForm.permissions.includes(perm.id) || roleForm.permissions.includes('ADMINISTRATOR');
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex items-start justify-between ${
                                isChecked
                                  ? 'border-brand-500/60 bg-brand-500/10 text-white'
                                  : 'border-dark-800 bg-dark-950/60 text-dark-300 hover:border-dark-700'
                              }`}
                            >
                              <div className="pr-3">
                                <div className="text-xs font-bold text-white">{perm.name}</div>
                                <div className="text-[10px] text-dark-400 leading-tight mt-0.5">{perm.description}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-1 rounded text-brand-500 focus:ring-0 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveRole}
                        disabled={loading}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        Zapisz rolę
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-dark-400">
                    Wybierz rolę z listy po lewej stronie, aby ją edytować.
                  </div>
                )}
              </div>
            )}

            {/* 3. ZAKŁADKA: KANAŁY SERWERA (CHANNELS) */}
            {activeTab === 'channels' && (
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Kanały serwera</h3>
                    <p className="text-xs text-dark-400">Zarządzaj kanałami tekstowymi, głosowymi i ich uprawnieniami.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddChannelForm(!showAddChannelForm)}
                    className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer transition-transform active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Utwórz kanał</span>
                  </button>
                </div>

                {/* Formularz szybkiego dodawania kanału */}
                {showAddChannelForm && (
                  <form onSubmit={handleCreateChannelInside} className="p-4 bg-dark-900 border border-brand-500/50 rounded-xl space-y-3 animate-fade-in shadow-lg">
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Sparkles size={14} className="text-brand-400" />
                      <span>Nowy kanał</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-dark-400 uppercase mb-1">Nazwa kanału</label>
                        <input
                          type="text"
                          required
                          value={newChannelForm.name}
                          onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                          placeholder="np. pogaduchy"
                          className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-dark-400 uppercase mb-1">Typ kanału</label>
                        <select
                          value={newChannelForm.type}
                          onChange={(e) => setNewChannelForm({ ...newChannelForm, type: e.target.value })}
                          className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="text">💬 Kanał tekstowy (#)</option>
                          <option value="voice">🔊 Kanał głosowy (Głos + Ekran)</option>
                        </select>
                      </div>
                    </div>

                    {/* Uprawnienia kanału */}
                    <div className="pt-2 border-t border-dark-800 space-y-2">
                      <div 
                        onClick={() => setNewChannelForm({ ...newChannelForm, isPrivate: !newChannelForm.isPrivate })}
                        className="flex items-center justify-between p-2 bg-dark-950 rounded-lg border border-dark-800 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <Lock size={14} className="text-amber-400" />
                          <span className="text-xs text-white font-semibold">Kanał prywatny (tylko wybrane role)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newChannelForm.isPrivate}
                          onChange={() => {}}
                          className="rounded text-brand-500"
                        />
                      </div>

                      {newChannelForm.type === 'text' && (
                        <div 
                          onClick={() => setNewChannelForm({ ...newChannelForm, readOnly: !newChannelForm.readOnly })}
                          className="flex items-center justify-between p-2 bg-dark-950 rounded-lg border border-dark-800 cursor-pointer"
                        >
                          <span className="text-xs text-white font-semibold">Kanał tylko do odczytu / Ogłoszenia</span>
                          <input
                            type="checkbox"
                            checked={newChannelForm.readOnly}
                            onChange={() => {}}
                            className="rounded text-brand-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddChannelForm(false)}
                        className="px-3 py-1.5 text-xs text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                      >
                        Utwórz
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista kanałów z edycją i usuwaniem */}
                <div className="space-y-2">
                  {channels.map((ch) => {
                    const isEditing = editingChannel?.id === ch.id;

                    return (
                      <div
                        key={ch.id}
                        className="p-3 bg-dark-900/70 border border-dark-700/80 rounded-xl flex items-center justify-between gap-3 transition-colors hover:border-dark-600"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`p-2 rounded-lg ${ch.type === 'voice' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand-500/15 text-brand-400'}`}>
                            {ch.type === 'voice' ? <Volume2 size={16} /> : <Hash size={16} />}
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={ch.name}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateChannelInside(ch.id, { name: e.target.value.trim() });
                                if (e.key === 'Escape') setEditingChannel(null);
                              }}
                              onBlur={(e) => handleUpdateChannelInside(ch.id, { name: e.target.value.trim() })}
                              className="bg-dark-950 border border-brand-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <div>
                              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                                <span>{ch.name}</span>
                                {ch.isPrivate && <Lock size={12} className="text-amber-400" title="Kanał prywatny" />}
                                {ch.readOnly && <span className="text-[10px] px-1 bg-dark-800 text-dark-300 rounded">Tylko odczyt</span>}
                                <span className="text-[10px] text-dark-400 font-normal">
                                  ({ch.type === 'voice' ? 'Głosowy' : 'Tekstowy'})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingChannel(ch)}
                            className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors cursor-pointer"
                            title="Zmień nazwę kanału"
                          >
                            <Edit2 size={14} />
                          </button>
                          {channels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteChannelInside(ch.id, ch.name)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Usuń ten kanał"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. ZAKŁADKA: ZARZĄDZANIE CZŁONKAMI (MEMBERS) */}
            {activeTab === 'members' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">Zarządzanie członkami ({members.length})</h3>
                  <p className="text-xs text-dark-400">Nadawaj lub odbieraj role członkom jednym kliknięciem.</p>
                </div>

                {/* Wyszukiwarka */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Szukaj członka po nazwie lub nicku..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Lista członków */}
                <div className="space-y-2">
                  {filteredMembers.map((member) => {
                    const assignedRoleIds = memberRolesMap[member.id] || [];
                    const isOwner = server.ownerId === member.id;

                    return (
                      <div
                        key={member.id}
                        className="p-3 bg-dark-900/60 border border-dark-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <UserAvatar user={member} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {member.displayName || member.username}
                              </span>
                              {isOwner && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                                  👑 Właściciel
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-dark-400">@{member.username}</span>
                          </div>
                        </div>

                        {/* Tagi ról */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {roles.map((r) => {
                            if (r.id === 'role-everyone') return null;
                            const hasThisRole = assignedRoleIds.includes(r.id) || (isOwner && r.id === 'role-owner');

                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => toggleMemberRole(member.id, r.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                                  hasThisRole
                                    ? 'border-transparent text-white shadow-sm'
                                    : 'border-dark-700/80 bg-dark-800/40 text-dark-400 hover:border-dark-600 hover:text-dark-200'
                                }`}
                                style={{
                                  backgroundColor: hasThisRole ? (r.color || '#5865f2') : undefined
                                }}
                                title={hasThisRole ? `Kliknij, aby odebrać rolę ${r.name}` : `Kliknij, aby nadać rolę ${r.name}`}
                              >
                                <span className="truncate">{r.name}</span>
                                {hasThisRole && <Check size={10} className="stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. ZAKŁADKA: USUŃ SERWER (DELETE) */}
            {activeTab === 'delete' && onDeleteServer && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4 max-w-xl">
                <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>Strefa niebezpieczna</span>
                </div>
                <p className="text-xs text-dark-300 leading-relaxed">
                  Usunięcie serwera jest <strong>nieodwracalne</strong>. Wszystkie kanały, historia wiadomości oraz przypisane role zostaną bezpowrotnie skasowane dla wszystkich członków.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Czy na pewno chcesz BEZPOWROTNIE usunąć serwer "${server.name}"?`)) {
                      onDeleteServer(server.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
                >
                  Usuń serwer bezpowrotnie
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
