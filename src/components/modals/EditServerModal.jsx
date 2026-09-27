import React, { useState, useEffect } from 'react';
import { X, Globe, Lock, Shield, Settings, Users, Plus, Trash2, Check, Search, ChevronRight } from 'lucide-react';
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
    description: 'Umożliwia tworzenie, edycję i usuwanie ról oraz nadawanie ich członkom.'
  },
  {
    id: 'MANAGE_CHANNELS',
    name: '💬 Zarządzanie kanałami',
    description: 'Umożliwia dodawanie, edycję oraz usuwanie kanałów tekstowych i głosowych.'
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

export const EditServerModal = ({ isOpen, onClose, server, onSave, onRefreshServer }) => {
  const { socket } = useSocket();

  // Aktywna zakładka: 'general' | 'roles' | 'members'
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

  // Stan członków
  const [members, setMembers] = useState([]);
  const [memberRolesMap, setMemberRolesMap] = useState({});
  const [memberSearch, setMemberSearch] = useState('');
  const [editingMemberRolesId, setEditingMemberRolesId] = useState(null);

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

      const serverRoles = server.roles || [];
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

      setMembers(server.membersList || []);
      setMemberRolesMap(server.memberRoles || {});
      setError('');
      setSuccessMsg('');
    }
  }, [server, isOpen]);

  // Gdy zmieniamy wybraną rolę w liście
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

  // Utworzenie nowej roli
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
      const updatedRoles = [...roles, newRole];
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

  // Zapis edytowanej roli
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

  // Usunięcie roli
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

  // Przełączanie uprawnienia w formularzu roli
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

  // Przypisanie / odebranie roli członkowi
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

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    return (m.displayName || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isSystemRole = selectedRoleId === 'role-owner' || selectedRoleId === 'role-everyone';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-3xl h-[88vh] max-h-[680px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative text-dark-100">
        {/* Nagłówek okna */}
        <div className="px-5 py-3.5 border-b border-dark-700 flex items-center justify-between bg-dark-850">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{server.icon || '💬'}</span>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{server.name} — Ustawienia</h2>
              <span className="text-[11px] text-dark-400">Zarządzaj opcjami, rolami i członkami serwera</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pasek zakładek */}
        <div className="flex border-b border-dark-700 bg-dark-900/80 px-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            <Settings size={15} />
            <span>Przegląd</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            <Shield size={15} />
            <span>Role serwera ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            <Users size={15} />
            <span>Zarządzanie członkami ({members.length})</span>
          </button>
        </div>

        {/* Powiadomienia błędu / sukcesu */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-lg animate-fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg animate-fade-in flex items-center space-x-1.5 font-medium">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Zawartość zakładek */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
          {/* 1. ZAKŁADKA OGÓLNE */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Nazwa serwera *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wpisz nazwę serwera..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Opis serwera
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Krótki opis serwera..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                  Widoczność serwera
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                      isPublic
                        ? 'border-brand-500 bg-brand-500/15 text-white'
                        : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                    }`}
                  >
                    <Globe size={22} className={isPublic ? 'text-brand-500 mb-1' : 'mb-1'} />
                    <span className="text-xs font-bold">Publiczny</span>
                    <span className="text-[10px] opacity-70">Widoczny w katalogu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                      !isPublic
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-dark-700 bg-dark-900/60 text-dark-400 hover:border-dark-600'
                    }`}
                  >
                    <Lock size={22} className={!isPublic ? 'text-amber-400 mb-1' : 'mb-1'} />
                    <span className="text-xs font-bold">Prywatny</span>
                    <span className="text-[10px] opacity-70">Tylko z kodem zaproszenia</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    Ikona
                  </label>
                  <div className="flex flex-wrap gap-1 bg-dark-900 p-2 rounded-lg border border-dark-700 max-h-24 overflow-y-auto">
                    {emojiOptions.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`text-lg p-1 rounded hover:bg-dark-700 transition-colors ${
                          icon === em ? 'bg-dark-600 ring-1 ring-brand-500' : ''
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    Kolor tła
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-dark-900 p-2 rounded-lg border border-dark-700">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany ogólne'}
                </button>
              </div>
            </form>
          )}

          {/* 2. ZAKŁADKA ROLE */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Lewa kolumna: Lista ról */}
              <div className="bg-dark-900/70 border border-dark-700/80 rounded-xl p-3 flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-dark-300 uppercase tracking-wider">Role</span>
                  <button
                    onClick={handleCreateRole}
                    disabled={loading}
                    className="flex items-center space-x-1 px-2 py-1 bg-brand-500/20 hover:bg-brand-500 text-brand-300 hover:text-white rounded-md text-[11px] font-bold transition-colors"
                  >
                    <Plus size={13} />
                    <span>Nowa</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
                  {roles.map((r) => {
                    const isSelected = r.id === selectedRoleId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-dark-700 text-white shadow-sm ring-1 ring-brand-500/40'
                            : 'text-dark-300 hover:bg-dark-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.color || '#99aab5' }}
                          />
                          <span className="truncate">{r.name}</span>
                        </div>
                        {isSelected && <ChevronRight size={14} className="text-brand-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prawa kolumna (2/3): Edytor wybranej roli */}
              <div className="md:col-span-2 bg-dark-900/70 border border-dark-700/80 rounded-xl p-4 flex flex-col space-y-4 overflow-y-auto scrollbar-thin">
                {selectedRole ? (
                  <>
                    <div className="flex items-center justify-between border-b border-dark-700/60 pb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: roleForm.color }}
                        />
                        <h3 className="text-sm font-bold text-white">
                          Edycja roli: {roleForm.name || 'Bez nazwy'}
                        </h3>
                      </div>

                      {!isSystemRole && (
                        <button
                          onClick={() => handleDeleteRole(selectedRole.id)}
                          disabled={loading}
                          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded-md transition-colors font-semibold"
                        >
                          <Trash2 size={14} />
                          <span>Usuń rolę</span>
                        </button>
                      )}
                    </div>

                    {/* Nazwa roli i Kolor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider mb-1">
                          Nazwa roli
                        </label>
                        <input
                          type="text"
                          value={roleForm.name}
                          onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={selectedRole.id === 'role-everyone'}
                          placeholder="Wpisz nazwę roli..."
                          className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider mb-1">
                          Kolor roli
                        </label>
                        <div className="flex items-center space-x-1.5 bg-dark-800 p-1.5 rounded-lg border border-dark-700">
                          {PRESET_ROLE_COLORS.slice(0, 7).map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setRoleForm(prev => ({ ...prev, color: hex }))}
                              className={`w-4 h-4 rounded-full transition-transform ${
                                roleForm.color === hex ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                          <input
                            type="color"
                            value={roleForm.color}
                            onChange={(e) => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                            className="w-5 h-5 bg-transparent border-0 cursor-pointer ml-auto rounded"
                            title="Własny kolor"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Opcja Hoist (Grupowanie na liście członków) */}
                    <div className="flex items-center justify-between p-3 bg-dark-800/70 border border-dark-700/60 rounded-xl">
                      <div>
                        <div className="text-xs font-bold text-white">Wyróżniaj członków roli osobno</div>
                        <div className="text-[10px] text-dark-400">Członkowie z tą rolą pojawią się w osobnej sekcji na liście użytkowników.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={roleForm.hoist}
                        onChange={(e) => setRoleForm(prev => ({ ...prev, hoist: e.target.checked }))}
                        className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Uprawnienia */}
                    <div>
                      <label className="block text-[11px] font-bold text-dark-300 uppercase tracking-wider mb-2">
                        Uprawnienia serwera ({roleForm.permissions.length})
                      </label>
                      <div className="space-y-2">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                          const isChecked = roleForm.permissions.includes(perm.id) || roleForm.permissions.includes('ADMINISTRATOR');
                          const isDirectChecked = roleForm.permissions.includes(perm.id);

                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                isDirectChecked
                                  ? 'bg-brand-500/15 border-brand-500/40 text-white'
                                  : 'bg-dark-800/40 border-dark-700/60 text-dark-300 hover:bg-dark-800'
                              }`}
                            >
                              <div className="pr-3">
                                <div className="text-xs font-bold text-white">{perm.name}</div>
                                <div className="text-[10px] text-dark-400 leading-tight">{perm.description}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // obsłużone przez kliknięcie w kontener
                                className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
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
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {loading ? 'Zapisywanie...' : 'Zapisz rolę'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-xs text-dark-400">
                    Wybierz rolę z lewej listy lub utwórz nową.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. ZAKŁADKA CZŁONKOWIE & RANGI */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {/* Wyszukiwarka */}
              <div className="relative">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Szukaj członka serwera..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <Search size={15} className="absolute left-3 top-2.5 text-dark-400" />
              </div>

              {/* Lista członków */}
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const assignedRoleIds = memberRolesMap[member.id] || [];
                  const isOwner = server.ownerId === member.id;
                  const isEditingThis = editingMemberRolesId === member.id;

                  return (
                    <div
                      key={member.id}
                      className="p-3 bg-dark-900/60 border border-dark-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      {/* Avatar i Nick */}
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

                      {/* Tagi przypisanych ról & szybkie nadawanie */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {roles.map((r) => {
                          if (r.id === 'role-everyone') return null;
                          const hasThisRole = assignedRoleIds.includes(r.id) || (isOwner && r.id === 'role-owner');

                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleMemberRole(member.id, r.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center space-x-1 ${
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

                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-xs text-dark-400">
                    Nie znaleziono członków pasujących do wyszukiwania.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
