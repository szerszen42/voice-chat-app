import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Hash, Phone, Smile, Send, Users, AtSign, Sparkles, MessageCircle, 
  Copy, Check, Menu, X, ChevronLeft, UserPlus, Shield, CheckSquare, Square,
  Paperclip, Image as ImageIcon, Film, FileText, Download, Play, Maximize2, Search,
  Trash2, Lock
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useVoice } from '../../context/VoiceContext';
import { playMessageSound } from '../../utils/sounds';
import { api } from '../../utils/api';

const POPULAR_GIFS = [
  { id: '1', title: 'GG / Gaming', category: 'gaming', url: 'https://media.giphy.com/media/l41JGlWa1xOjJSsV2/giphy.gif' },
  { id: '2', title: 'Let\'s Go / Hype', category: 'hype', url: 'https://media.giphy.com/media/FibBZ3bFGGcoGVcVZB/giphy.gif' },
  { id: '3', title: 'Popcorn / Kibic', category: 'fun', url: 'https://media.giphy.com/media/GLbiGvv9RiNpPdzyxs/giphy.gif' },
  { id: '4', title: 'Cat Vibe / Muzyka', category: 'cats', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif' },
  { id: '5', title: 'Mind Blown / Szok', category: 'shock', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '6', title: 'Laughing / Haha', category: 'laugh', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  { id: '7', title: 'Dance / Taniec', category: 'dance', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '8', title: 'Hello / Siema', category: 'hello', url: 'https://media.giphy.com/media/mG1uA7JnuAZqbWV44g/giphy.gif' },
  { id: '9', title: 'Thumbs Up / Super', category: 'hype', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '10', title: 'Victory / Wygrana', category: 'gaming', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '11', title: 'Facepalm', category: 'fun', url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif' },
  { id: '12', title: 'Brawo / Brawa', category: 'hype', url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif' },
  { id: '13', title: 'Kot Szok', category: 'cats', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { id: '14', title: 'Rage Quit / Gracz', category: 'gaming', url: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif' },
  { id: '15', title: 'Party / Impreza', category: 'dance', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '16', title: 'Epic Win / Epickie', category: 'gaming', url: 'https://media.giphy.com/media/d2Z4NRCUxsxZBvag/giphy.gif' }
];

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const ChatArea = ({
  server,
  channel,
  dmUser,
  messages = [],
  onSendMessage,
  onDeleteMessage,
  onSelectDmUser,
  serverMembers = [],
  onToggleMobileSidebar,
  onToggleMobileMembers,
  mobilePane = 'chat',
  onOpenUserProfile,
  onRefreshServer
}) => {
  const { user } = useAuth();
  const { socket, userStatuses } = useSocket();
  const { startDirectCall, directCallState } = useVoice();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [showMembersList, setShowMembersList] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Menu kontekstowe (LPM / PPM na użytkownika lub wiadomość)
  const [userContextMenu, setUserContextMenu] = useState(null);
  const [msgContextMenu, setMsgContextMenu] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const isOwner = server?.ownerId === user?.id;
  const userPermissions = server?.currentUserPermissions || [];
  const canManageRoles = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_ROLES');
  const canManageMessages = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_MESSAGES');
  const canManageChannels = isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_CHANNELS');

  const myRoleIds = (server?.memberRoles && user?.id && server.memberRoles[user.id]) || [];

  const isChannelReadOnly = useMemo(() => {
    if (!channel || channel.type !== 'text') return false;
    if (isOwner || userPermissions.includes('ADMINISTRATOR') || userPermissions.includes('MANAGE_MESSAGES') || userPermissions.includes('MANAGE_CHANNELS')) {
      return false;
    }
    if (channel.readOnly) {
      if (channel.allowSendRoleIds && channel.allowSendRoleIds.length > 0) {
        return !channel.allowSendRoleIds.some(rId => myRoleIds.includes(rId));
      }
      return true;
    }
    return false;
  }, [channel, isOwner, userPermissions, myRoleIds]);

  const canDeleteMsg = (msg) => {
    if (!user || !msg) return false;
    if (channel) {
      const isAuthor = (msg.user?.id === user.id) || (msg.userId === user.id) || (msg.senderId === user.id);
      return isAuthor || canManageMessages;
    } else {
      return (msg.senderId === user.id) || (msg.user?.id === user.id) || (msg.userId === user.id);
    }
  };

  const handleDeleteMessage = async (msg) => {
    if (!msg) return;
    if (!confirm('Czy na pewno chcesz usunąć tę wiadomość?')) return;

    // Natychmiastowe usunięcie z lokalnego widoku bez czekania na sieć
    if (onDeleteMessage) {
      onDeleteMessage(msg.id);
    }
    setMsgContextMenu(null);

    try {
      if (channel) {
        await api.deleteChannelMessage(channel.id, msg.id).catch(() => {});
        if (socket) {
          socket.emit('delete-message', {
            messageId: msg.id,
            channelId: channel.id,
            serverId: server?.id
          });
        }
      } else if (dmUser) {
        if (socket) {
          socket.emit('delete-direct-message', {
            messageId: msg.id,
            recipientId: dmUser.id
          });
        }
      }
    } catch (err) {
      console.error('Błąd usuwania wiadomości:', err);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserContextMenu(null);
        setMsgContextMenu(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('contextmenu', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingAttachments]);

  useEffect(() => {
    if (!socket || !channel) return;

    socket.on('user-typing', ({ channelId, user: typingUser }) => {
      if (channelId === channel.id && typingUser.id !== user?.id) {
        setTypingUsers(prev => new Set(prev).add(typingUser.displayName));
      }
    });

    socket.on('user-stop-typing', ({ channelId, userId }) => {
      if (channelId === channel.id) {
        setTypingUsers(new Set());
      }
    });

    return () => {
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [socket, channel, user]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && channel) {
      socket.emit('typing-start', { channelId: channel.id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { channelId: channel.id });
      }, 2000);
    }
  };

  // Obsługa wyboru plików z dysku
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 25 * 1024 * 1024) {
        alert(`Plik "${file.name}" jest za duży! Maksymalny rozmiar to 25MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        setPendingAttachments(prev => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            url: event.target.result,
            isImage,
            isVideo
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Obsługa wklejania ze schowka (Ctrl + V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            setPendingAttachments(prev => [
              ...prev,
              {
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name || `Schowek-${Date.now()}.${isImage ? 'png' : 'dat'}`,
                type: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
                size: file.size,
                url: event.target.result,
                isImage,
                isVideo
              }
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Obsługa wysyłania
  const handleSend = (e) => {
    e?.preventDefault();
    const hasText = inputText.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    onSendMessage(inputText.trim(), pendingAttachments);
    setInputText('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    if (socket && channel) {
      socket.emit('typing-stop', { channelId: channel.id });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sendDirectGif = (gifUrl) => {
    onSendMessage('', [
      {
        id: `gif-${Date.now()}`,
        name: 'reaction.gif',
        type: 'image/gif',
        url: gifUrl,
        isImage: true
      }
    ]);
    setShowGifPicker(false);
  };

  const popularEmojis = ['😀', '😂', '🔥', '🚀', '❤️', '👍', '🎉', '🎙️', '🎮', '✨', '😎', '🍕', '👀', '💯', '🌸'];

  const addEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleUserClickOrContextMenu = (e, targetUser) => {
    if (!targetUser) return;
    e.preventDefault();
    e.stopPropagation();
    setMsgContextMenu(null);

    const clientX = e.clientX || e.touches?.[0]?.clientX || 100;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 100;

    setUserContextMenu({
      x: Math.min(clientX, window.innerWidth - 220),
      y: Math.min(clientY, window.innerHeight - 260),
      targetUser
    });
  };

  const handleMsgRightClick = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setUserContextMenu(null);
    setMsgContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 100),
      message
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const toggleRoleForMember = async (memberId, roleId) => {
    if (!server) return;
    const currentMemberRoles = server.memberRoles?.[memberId] || [];
    const hasRole = currentMemberRoles.includes(roleId);

    const nextRoles = hasRole
      ? currentMemberRoles.filter(id => id !== roleId)
      : [...currentMemberRoles, roleId];

    try {
      await api.setMemberRoles(server.id, memberId, nextRoles);
      if (socket) socket.emit('notify-server-updated', { serverId: server.id });
      if (onRefreshServer) onRefreshServer(server.id);
    } catch (err) {
      alert(err.message || 'Nie udało się nadać roli.');
    }
  };

  const memberGroups = useMemo(() => {
    if (!serverMembers || serverMembers.length === 0) return [];

    const groupsMap = new Map();
    const onlineOthers = [];
    const offlineOthers = [];

    serverMembers.forEach(member => {
      const status = userStatuses[member.id] || member.status || 'offline';
      const isOnline = status !== 'offline';
      const highestRole = member.highestRole;

      if (highestRole && highestRole.hoist && highestRole.id !== 'role-everyone') {
        if (!groupsMap.has(highestRole.id)) {
          groupsMap.set(highestRole.id, {
            id: highestRole.id,
            name: highestRole.name,
            color: highestRole.color,
            position: highestRole.position || 0,
            members: []
          });
        }
        groupsMap.get(highestRole.id).members.push(member);
      } else {
        if (isOnline) {
          onlineOthers.push(member);
        } else {
          offlineOthers.push(member);
        }
      }
    });

    const sortedRoleGroups = Array.from(groupsMap.values()).sort((a, b) => b.position - a.position);

    const result = [...sortedRoleGroups];
    if (onlineOthers.length > 0) {
      result.push({
        id: 'group-online',
        name: `Dostępni — ${onlineOthers.length}`,
        color: '#949ba4',
        members: onlineOthers
      });
    }
    if (offlineOthers.length > 0) {
      result.push({
        id: 'group-offline',
        name: `Niedostępni — ${offlineOthers.length}`,
        color: '#747f8d',
        members: offlineOthers
      });
    }

    return result;
  }, [serverMembers, userStatuses]);

  const filteredGifs = useMemo(() => {
    if (!gifSearch.trim()) return POPULAR_GIFS;
    const q = gifSearch.toLowerCase();
    return POPULAR_GIFS.filter(g => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [gifSearch]);

  const title = channel ? channel.name : (dmUser?.displayName || dmUser?.username || 'Wiadomości prywatne');

  return (
    <div 
      onPaste={handlePaste}
      className="flex-1 flex flex-col h-full bg-dark-700 min-w-0 overflow-hidden relative select-none"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,video/*,audio/*,application/*,text/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. Górny pasek nagłówka czatu */}
      <div className="h-12 px-4 border-b border-dark-900/60 flex items-center justify-between shadow-sm bg-dark-700/80 backdrop-blur z-10 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 -ml-1 text-dark-300 hover:text-white hover:bg-dark-600 rounded-lg"
            title="Pokaż listę serwerów i kanałów"
          >
            <Menu size={18} />
          </button>

          {channel ? (
            <Hash size={20} className="text-dark-400 flex-shrink-0" />
          ) : (
            <div
              onClick={() => onOpenUserProfile && dmUser?.id && onOpenUserProfile(dmUser.id)}
              className="cursor-pointer"
            >
              <UserAvatar user={dmUser} size="xs" />
            </div>
          )}

          <div className="min-w-0">
            <span
              onClick={() => {
                if (dmUser && onOpenUserProfile) onOpenUserProfile(dmUser.id);
              }}
              className={`font-bold text-sm text-white truncate block ${dmUser ? 'hover:underline cursor-pointer' : ''}`}
            >
              {title}
            </span>
            {channel?.topic && (
              <span className="text-[11px] text-dark-400 truncate block hidden sm:inline">
                {channel.topic}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {dmUser && (
            <button
              onClick={() => startDirectCall(dmUser)}
              className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
              title="Zadzwoń głosowo 1-na-1"
            >
              <Phone size={15} />
              <span className="hidden sm:inline">Zadzwoń</span>
            </button>
          )}

          {server && (
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  onToggleMobileMembers();
                } else {
                  setShowMembersList(!showMembersList);
                }
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                showMembersList ? 'text-white bg-dark-600' : 'text-dark-400 hover:text-white'
              }`}
              title="Pokaż/Ukryj listę członków serwera"
            >
              <Users size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Główna przestrzeń wiadomości + Lista członków */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Obszar przewijanych wiadomości */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            
            {/* Wiadomość powitalna */}
            <div className="py-6 border-b border-dark-600/50 mb-4">
              <div className="w-16 h-16 rounded-full bg-dark-600 flex items-center justify-center mb-3">
                {channel ? <Hash size={32} className="text-white" /> : <MessageCircle size={32} className="text-white" />}
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {channel ? `Witaj na #${channel.name}!` : `Początek rozmowy z ${dmUser?.displayName || dmUser?.username}`}
              </h2>
              <p className="text-xs text-dark-300">
                {channel
                  ? 'To jest początek tego kanału. Możesz pisać wiadomości, wysyłać GIFy, zdjęcia, pliki i wideo!'
                  : 'To jest początek Twojej bezpośredniej historii wiadomości prywatnych.'}
              </p>
            </div>

            {/* Lista wiadomości */}
            {messages.map((msg, index) => {
              const authorId = msg?.user?.id || msg?.userId || msg?.senderId;
              const isCurrentUser = authorId === user?.id;
              const matchedMember = (serverMembers || []).find(m => m.id === authorId);
              const author = isCurrentUser
                ? { ...msg?.user, ...user }
                : (matchedMember ? { ...msg?.user, ...matchedMember } : (msg?.user || (msg?.senderId === user?.id ? user : dmUser)));
              const authorHighestRole = (server?.roles && author?.id && server?.memberRoles?.[author.id])
                ? server.roles
                    .filter(r => r && (server.memberRoles[author.id] || []).includes(r.id))
                    .sort((a, b) => (b?.position || 0) - (a?.position || 0))[0]
                : null;

              const timeStr = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={msg.id || index}
                  onContextMenu={(e) => handleMsgRightClick(e, msg)}
                  className="flex items-start space-x-3 p-1.5 rounded-xl hover:bg-dark-600/30 transition-colors group cursor-pointer relative"
                >
                  {/* Pasek szybkich akcji po najechaniu myszką */}
                  <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-800/95 border border-dark-600 rounded-lg p-0.5 flex items-center space-x-1 shadow-lg z-10">
                    {msg.text && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(msg.text || '');
                        }}
                        className="p-1 rounded hover:bg-dark-700 text-dark-300 hover:text-white transition-colors"
                        title="Kopiuj tekst"
                      >
                        <Copy size={13} />
                      </button>
                    )}
                    {canDeleteMsg(msg) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(msg);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                        title="Usuń wiadomość"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenUserProfile && author?.id) {
                        onOpenUserProfile(author.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      handleUserClickOrContextMenu(e, author);
                    }}
                    className="cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                    title="Kliknij, aby otworzyć profil"
                  >
                    <UserAvatar user={author} size="md" showStatus={false} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClickOrContextMenu(e, author);
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                          handleUserClickOrContextMenu(e, author);
                        }}
                        className="text-sm font-semibold hover:underline cursor-pointer"
                        style={{ color: authorHighestRole?.color || '#ffffff' }}
                      >
                        {author?.displayName || author?.username || 'Użytkownik'}
                      </span>

                      {authorHighestRole && authorHighestRole.id !== 'role-everyone' && (
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${authorHighestRole.color}25`,
                            color: authorHighestRole.color,
                            border: `1px solid ${authorHighestRole.color}50`
                          }}
                        >
                          {authorHighestRole.name}
                        </span>
                      )}

                      <span className="text-[10px] text-dark-400">{timeStr}</span>
                    </div>

                    {/* Treść tekstowa wiadomości */}
                    {msg.text && (
                      <div className="text-sm text-dark-100 whitespace-pre-wrap break-words mt-0.5 leading-relaxed selection:bg-brand-500 selection:text-white select-text">
                        {msg.text}
                      </div>
                    )}

                    {/* Załączniki multimedialne (Zdjęcia, GIFy, Filmy, Pliki) */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2.5">
                        {msg.attachments.map((att, attIdx) => {
                          const isImg = att.isImage || (att.type && att.type.startsWith('image/')) || att.url?.startsWith('data:image/') || att.url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                          const isVid = att.isVideo || (att.type && att.type.startsWith('video/')) || att.url?.startsWith('data:video/') || att.url?.match(/\.(mp4|webm|mov)($|\?)/i);

                          if (isImg) {
                            return (
                              <div 
                                key={attIdx} 
                                className="relative group/att rounded-2xl overflow-hidden max-w-sm border border-dark-600/80 shadow-md bg-black/40"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name || 'Zdjęcie'}
                                  onClick={() => setLightboxImage(att.url)}
                                  className="max-h-72 w-auto object-contain rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                                  loading="lazy"
                                />
                              </div>
                            );
                          }

                          if (isVid) {
                            return (
                              <div key={attIdx} className="rounded-2xl overflow-hidden max-w-md border border-dark-600 bg-black shadow-lg">
                                <video
                                  src={att.url}
                                  controls
                                  playsInline
                                  className="max-h-80 w-full rounded-2xl"
                                />
                              </div>
                            );
                          }

                          // Zwykły plik (ZIP, PDF, DOC itp.)
                          return (
                            <a
                              key={attIdx}
                              href={att.url}
                              download={att.name || 'plik'}
                              className="flex items-center space-x-3 p-3 bg-dark-800 hover:bg-dark-600/90 border border-dark-600 rounded-2xl max-w-xs transition-colors shadow text-white group/file"
                            >
                              <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl group-hover/file:bg-brand-500 group-hover/file:text-white transition-colors">
                                <FileText size={22} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">{att.name || 'Pobierz plik'}</div>
                                <div className="text-[10px] text-dark-400">{formatFileSize(att.size)}</div>
                              </div>
                              <Download size={16} className="text-dark-400 group-hover/file:text-white transition-colors flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Wskaźnik "X pisze..." */}
          {typingUsers.size > 0 && (
            <div className="px-4 py-1 text-xs text-brand-500 italic animate-pulse">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'pisze...' : 'piszą...'}
            </div>
          )}

          {/* Pasek oczekujących załączników przed wysłaniem */}
          {pendingAttachments.length > 0 && (
            <div className="mx-4 mb-2 p-2.5 bg-dark-800 border border-dark-600 rounded-xl flex items-center space-x-2 overflow-x-auto scrollbar-thin animate-fade-in">
              {pendingAttachments.map((att) => (
                <div key={att.id} className="relative group/att bg-dark-900 border border-dark-700 rounded-lg p-1.5 flex items-center space-x-2 flex-shrink-0 pr-6">
                  {att.isImage ? (
                    <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                  ) : att.isVideo ? (
                    <div className="w-10 h-10 bg-dark-700 rounded flex items-center justify-center text-brand-400"><Film size={18} /></div>
                  ) : (
                    <div className="w-10 h-10 bg-dark-700 rounded flex items-center justify-center text-brand-400"><FileText size={18} /></div>
                  )}
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-white truncate max-w-[100px]">{att.name}</div>
                    <div className="text-[9px] text-dark-400">{formatFileSize(att.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(att.id)}
                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* POLE WPROWADZANIA WIADOMOŚCI */}
          <div className="px-3 sm:px-4 pb-safe-bottom sm:pb-4 select-none relative">
            
            {/* Popup wyboru Emoji */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 sm:bottom-16 right-4 sm:right-16 bg-dark-800 border border-dark-600 rounded-xl p-3 shadow-2xl z-30 grid grid-cols-5 gap-2 animate-fade-in">
                {popularEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-dark-700 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Popup wyboru GIFów */}
            {showGifPicker && (
              <div className="absolute bottom-20 sm:bottom-16 right-2 sm:right-24 bg-dark-850 border border-dark-600 rounded-2xl p-3 shadow-2xl z-30 w-80 max-w-[90vw] animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-700">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Sparkles size={14} className="text-brand-400" />
                    <span>Wybierz GIF reakcji</span>
                  </div>
                  <button onClick={() => setShowGifPicker(false)} className="text-dark-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="text"
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    placeholder="Szukaj GIFów (gaming, laugh, cat...)"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto scrollbar-thin p-1">
                  {filteredGifs.map((gif) => (
                    <div
                      key={gif.id}
                      onClick={() => sendDirectGif(gif.url)}
                      className="rounded-xl overflow-hidden cursor-pointer group relative border border-dark-700 hover:border-brand-500 hover:scale-[1.03] transition-all bg-dark-900"
                    >
                      <img src={gif.url} alt={gif.title} className="w-full h-24 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[10px] text-white font-bold text-center truncate">
                        {gif.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GŁÓWNY INPUT CZATU */}
            {isChannelReadOnly ? (
              <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-3.5 flex items-center justify-center space-x-2.5 text-dark-300 text-xs shadow-inner">
                <Lock size={16} className="text-amber-400 flex-shrink-0" />
                <span className="font-medium text-center">
                  Ten kanał jest tylko do odczytu (ogłoszenia). Tylko administratorzy i uprawnione role mogą wysyłać wiadomości.
                </span>
              </div>
            ) : (
              <div className="bg-dark-600 rounded-xl flex items-center px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500 shadow-inner">
                
                {/* Przycisk Załącznika (Zdjęcia, Filmy, Pliki) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-1.5 text-dark-300 hover:text-white hover:bg-dark-700/80 active:scale-95 rounded-lg transition-all mr-1 cursor-pointer flex-shrink-0"
                  title="Dodaj załącznik (Zdjęcie, Film, Plik)"
                >
                  <Paperclip size={20} />
                </button>

                <textarea
                  rows="1"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={channel ? `Napisz na #${channel.name} (wklejaj zdjęcia Ctrl+V, wysyłaj pliki)` : `Napisz do @${dmUser?.displayName || dmUser?.username}`}
                  className="flex-1 bg-transparent text-dark-100 placeholder-dark-400 text-sm focus:outline-none resize-none max-h-32"
                />

                <div className="flex items-center space-x-1.5 ml-2 text-dark-400 flex-shrink-0">
                  {/* Przycisk GIF */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                    }}
                    className={`px-1.5 py-0.5 text-xs font-black rounded-md border transition-all cursor-pointer ${
                      showGifPicker
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'border-dark-500 text-dark-300 hover:border-white hover:text-white'
                    }`}
                    title="Wstaw GIF"
                  >
                    GIF
                  </button>

                  {/* Przycisk Emoji */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowGifPicker(false);
                    }}
                    className="hover:text-amber-400 transition-colors p-1 cursor-pointer"
                    title="Wstaw emoji"
                  >
                    <Smile size={20} />
                  </button>

                  {/* Przycisk Wyślij */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim() && pendingAttachments.length === 0}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      inputText.trim() || pendingAttachments.length > 0
                        ? 'bg-brand-500 text-white hover:bg-brand-600 shadow'
                        : 'text-dark-500 cursor-not-allowed opacity-50'
                    }`}
                    title="Wyślij wiadomość (Enter)"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Prawy pasek członków serwera (Tylko na komputerze / dużym ekranie) */}
        {server && showMembersList && (
          <div className="hidden md:flex w-56 bg-dark-800 border-l border-dark-900/60 p-3 flex-col h-full overflow-hidden flex-shrink-0">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
              {memberGroups.map((group) => (
                <div key={group.id} className="space-y-0.5">
                  <div
                    className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
                    style={{ color: group.color || '#949ba4' }}
                  >
                    <span className="truncate">{group.name}</span>
                    <span className="text-[10px] opacity-75">{group.members.length}</span>
                  </div>

                  {group.members.map((member) => {
                    const status = userStatuses[member.id] || member.status || 'offline';
                    const roleColor = member.highestRole?.color || (status === 'offline' ? '#747f8d' : '#dcddde');

                    return (
                      <div
                        key={member.id}
                        onContextMenu={(e) => handleUserClickOrContextMenu(e, member)}
                        onClick={(e) => handleUserClickOrContextMenu(e, member)}
                        className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-dark-700/60 cursor-pointer transition-colors group"
                        title={`${member.displayName || member.username} (Kliknij dla opcji i ról)`}
                      >
                        <UserAvatar user={member} size="sm" statusOverride={status} />
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-semibold truncate transition-colors"
                            style={{ color: roleColor }}
                          >
                            {member.displayName || member.username}
                          </div>
                          {member.customStatus ? (
                            <div className="text-[10px] text-dark-400 truncate">
                              {member.customStatus}
                            </div>
                          ) : member.highestRole && member.highestRole.id !== 'role-everyone' ? (
                            <div
                              className="text-[9px] font-bold truncate uppercase tracking-wider"
                              style={{ color: `${member.highestRole.color}cc` }}
                            >
                              {member.highestRole.name}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MENU KONTEKSTOWE DLA UŻYTKOWNIKA (LPM / PPM) */}
      {userContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[210px] animate-fade-in text-dark-100 space-y-0.5"
          style={{
            top: userContextMenu.y,
            left: userContextMenu.x
          }}
        >
          <div className="px-3 py-1.5 border-b border-dark-800 mb-1 flex items-center space-x-2">
            <UserAvatar user={userContextMenu.targetUser} size="sm" />
            <div className="min-w-0">
              <div
                className="text-xs font-bold truncate"
                style={{ color: userContextMenu.targetUser.highestRole?.color || '#ffffff' }}
              >
                {userContextMenu.targetUser.displayName || userContextMenu.targetUser.username}
              </div>
              <div className="text-[10px] text-dark-400">@{userContextMenu.targetUser.username}</div>
            </div>
          </div>

          {onOpenUserProfile && (
            <button
              onClick={() => {
                onOpenUserProfile(userContextMenu.targetUser.id);
                setUserContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors font-medium cursor-pointer"
            >
              <Users size={14} />
              <span>Zobacz profil</span>
            </button>
          )}

          {userContextMenu.targetUser.id !== user?.id && (
            <>
              <button
                onClick={() => {
                  if (onSelectDmUser) {
                    onSelectDmUser(userContextMenu.targetUser);
                  }
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Napisz wiadomość (PV)</span>
              </button>

              <button
                onClick={() => {
                  startDirectCall(userContextMenu.targetUser);
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Phone size={14} />
                <span>Zadzwoń głosowo</span>
              </button>
            </>
          )}

          {server && canManageRoles && server.roles && (
            <div className="pt-1 mt-1 border-t border-dark-800">
              <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center space-x-1">
                <Shield size={11} className="text-amber-400" />
                <span>Zarządzaj rolami:</span>
              </div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto scrollbar-thin">
                {server.roles
                  .filter(r => r.id !== 'role-everyone')
                  .map(role => {
                    const memberRoles = server.memberRoles?.[userContextMenu.targetUser.id] || [];
                    const hasThisRole = memberRoles.includes(role.id) || (server.ownerId === userContextMenu.targetUser.id && role.id === 'role-owner');

                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRoleForMember(userContextMenu.targetUser.id, role.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                          hasThisRole
                            ? 'bg-dark-700 text-white font-semibold'
                            : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                          <span className="truncate">{role.name}</span>
                        </div>
                        {hasThisRole ? <CheckSquare size={13} className="text-emerald-400" /> : <Square size={13} className="text-dark-500" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MENU KONTEKSTOWE DLA WIADOMOŚCI */}
      {msgContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[170px] animate-fade-in text-dark-100 space-y-0.5"
          style={{
            top: msgContextMenu.y,
            left: msgContextMenu.x
          }}
        >
          {msgContextMenu.message.text && (
            <button
              onClick={() => {
                copyToClipboard(msgContextMenu.message.text || '');
                setMsgContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-dark-700 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Copy size={14} />
              <span>Kopiuj tekst</span>
            </button>
          )}

          {canDeleteMsg(msgContextMenu.message) && (
            <button
              onClick={() => {
                handleDeleteMessage(msgContextMenu.message);
                setMsgContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer font-medium"
            >
              <Trash2 size={14} />
              <span>Usuń wiadomość</span>
            </button>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL DLA ZDJĘĆ NA PEŁNY EKRAN */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Powiększenie"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

    </div>
  );
};
