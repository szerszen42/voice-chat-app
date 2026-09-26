import React, { useState, useEffect, useRef } from 'react';
import { Hash, Phone, Smile, Send, Users, AtSign, Sparkles, MessageCircle, Copy, Check, Menu, X, ChevronLeft } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useVoice } from '../../context/VoiceContext';
import { playMessageSound } from '../../utils/sounds';

export const ChatArea = ({
  channel, // Jeśli na serwerze: { id, name, topic, serverId }
  dmUser,  // Jeśli na PV: { id, displayName, username, avatarColor, avatarEmoji, status, customStatus }
  messages = [],
  onSendMessage,
  onSelectDmUser,
  serverMembers = [],
  onToggleMobileSidebar,
  onToggleMobileMembers,
  mobilePane = 'chat'
}) => {
  const { user } = useAuth();
  const { socket, userStatuses } = useSocket();
  const { startDirectCall, directCallState } = useVoice();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembersList, setShowMembersList] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // Menu kontekstowe (PPM na użytkownika lub wiadomość)
  const [userContextMenu, setUserContextMenu] = useState(null); // { x, y, targetUser }
  const [msgContextMenu, setMsgContextMenu] = useState(null); // { x, y, message }
  const [copiedText, setCopiedText] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const menuRef = useRef(null);

  // Zamykanie menu po kliknięciu
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

  // Auto-scroll na dół przy nowej wiadomości
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Obsługa wskaźnika pisania (typing indicator)
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

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');

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

  const popularEmojis = ['😀', '😂', '🔥', '🚀', '❤️', '👍', '🎉', '🎙️', '🎮', '✨', '😎', '🍕', '👀', '💯', '🌸'];

  const addEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleUserRightClick = (e, targetUser) => {
    if (!targetUser) return;
    e.preventDefault();
    e.stopPropagation();
    setMsgContextMenu(null);
    setUserContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetUser
    });
  };

  const handleMsgRightClick = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setUserContextMenu(null);
    setMsgContextMenu({
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const title = channel ? `# ${channel.name}` : (dmUser ? (dmUser.displayName || dmUser.username) : '');
  const subtitle = channel ? (channel.topic || `Początek kanału #${channel.name}`) : (dmUser ? `@${dmUser.username}` : '');
  const activeStatus = dmUser ? (userStatuses[dmUser.id] || dmUser.status) : null;

  return (
    <div className="flex-1 flex bg-dark-700 h-full overflow-hidden relative select-none">
      {/* Główna kolumna czatu */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Górny pasek tytułowy */}
        <div className="h-12 px-3 sm:px-4 border-b border-dark-900/40 shadow-sm flex items-center justify-between bg-dark-700 select-none z-10">
          <div className="flex items-center space-x-2 truncate">
            {/* Przycisk Menu / Paska bocznego na telefonie */}
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-1.5 -ml-1 text-dark-300 hover:text-white rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center flex-shrink-0"
              title="Przełącz menu (lub przesuń palcem w prawo)"
            >
              <Menu size={20} />
            </button>

            {channel ? (
              <Hash size={20} className="text-dark-400 flex-shrink-0" />
            ) : dmUser ? (
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onContextMenu={(e) => handleUserRightClick(e, dmUser)}
              >
                <UserAvatar user={dmUser} size="sm" statusOverride={activeStatus} />
              </div>
            ) : null}

            <div className="truncate">
              <span className="font-bold text-dark-100 truncate text-sm mr-2">{title}</span>
              {subtitle && <span className="text-xs text-dark-400 truncate hidden sm:inline">| {subtitle}</span>}
            </div>
          </div>

          {/* Przyciski w nagłówku */}
          <div className="flex items-center space-x-2 text-dark-300">
            {/* Przycisk DZWONIENIA NA PV */}
            {dmUser && (
              <button
                onClick={() => startDirectCall(dmUser)}
                disabled={directCallState !== null}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  directCallState
                    ? 'bg-dark-600 text-dark-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-600/30'
                }`}
                title="Zadzwoń głosowo na PV"
              >
                <Phone size={15} />
                <span className="hidden sm:inline">Zadzwoń na PV</span>
              </button>
            )}

            {/* Przycisk listy członków (dla serwera) */}
            {channel && serverMembers.length > 0 && (
              <button
                onClick={() => {
                  if (window.innerWidth < 768 && onToggleMobileMembers) {
                    onToggleMobileMembers();
                  } else {
                    setShowMembersList(!showMembersList);
                  }
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  (showMembersList || mobilePane === 'members') ? 'bg-dark-600 text-white' : 'hover:bg-dark-600 hover:text-dark-100'
                }`}
                title="Lista członków serwera (lub przesuń palcem w lewo)"
              >
                <Users size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Lista wiadomości */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Baner powitalny */}
          <div className="pt-6 pb-4 border-b border-dark-600/40">
            <div className="w-16 h-16 rounded-full bg-dark-600 flex items-center justify-center text-3xl mb-3 text-white">
              {channel ? <Hash size={36} /> : (dmUser ? (dmUser.avatarEmoji || '👋') : <Sparkles size={36} />)}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {channel ? `Witaj na #${channel.name}!` : `Początek rozmowy z ${dmUser?.displayName || dmUser?.username}`}
            </h2>
            <p className="text-sm text-dark-400">
              {channel
                ? `To jest sam początek kanału #${channel.name}. Wyślij pierwszą wiadomość!`
                : `To jest Twoja bezpośrednia, prywatna historia wiadomości z ${dmUser?.displayName || dmUser?.username}.`}
            </p>
          </div>

          {/* Wiadomości */}
          {messages.map((msg, index) => {
            const isOwn = msg.userId === user?.id || msg.senderId === user?.id;
            const author = msg.user || (isOwn ? user : dmUser);
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={msg.id || index}
                onContextMenu={(e) => handleMsgRightClick(e, msg)}
                className="flex items-start space-x-3 p-1 rounded-md hover:bg-dark-600/30 transition-colors group cursor-pointer"
              >
                <div
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    handleUserRightClick(e, author);
                  }}
                  className="cursor-pointer"
                >
                  <UserAvatar user={author} size="md" showStatus={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        handleUserRightClick(e, author);
                      }}
                      className="text-sm font-semibold text-white hover:underline cursor-pointer"
                    >
                      {author?.displayName || author?.username || 'Użytkownik'}
                    </span>
                    <span className="text-[10px] text-dark-400">{timeStr}</span>
                  </div>
                  <div className="text-sm text-dark-100 whitespace-pre-wrap break-words mt-0.5 leading-relaxed selection:bg-brand-500 selection:text-white select-text">
                    {msg.text}
                  </div>
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

        {/* Pole wprowadzania wiadomości */}
        <div className="px-4 pb-4 select-none relative">
          {/* Popup wyboru Emoji */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 right-6 bg-dark-800 border border-dark-600 rounded-xl p-3 shadow-2xl z-30 grid grid-cols-5 gap-2">
              {popularEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-dark-700"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="bg-dark-600 rounded-lg flex items-center px-4 py-2.5 focus-within:ring-1 focus-within:ring-brand-500 shadow-inner">
            <textarea
              rows="1"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={channel ? `Napisz na #${channel.name}` : `Napisz do @${dmUser?.displayName || dmUser?.username}`}
              className="flex-1 bg-transparent text-dark-100 placeholder-dark-400 text-sm focus:outline-none resize-none max-h-32"
            />
            <div className="flex items-center space-x-2 ml-2 text-dark-400">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="hover:text-amber-400 transition-colors p-1"
                title="Wstaw emoji"
              >
                <Smile size={20} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim()}
                className={`p-1.5 rounded-md transition-all ${
                  inputText.trim()
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'text-dark-500 cursor-not-allowed'
                }`}
                title="Wyślij wiadomość (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prawa kolumna: Lista członków serwera (Desktop) */}
      {channel && showMembersList && serverMembers.length > 0 && (
        <div className="hidden md:flex w-56 bg-dark-800 border-l border-dark-900/60 flex-col h-full py-3 px-2 select-none">
          <div className="px-2 pb-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
            Członkowie serwera — {serverMembers.length}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
            {serverMembers.map((member) => {
              const status = userStatuses[member.id] || member.status || 'offline';
              return (
                <div
                  key={member.id}
                  onContextMenu={(e) => handleUserRightClick(e, member)}
                  onClick={() => {
                    if (member.id !== user?.id && onSelectDmUser) {
                      onSelectDmUser(member);
                    }
                  }}
                  className="flex items-center space-x-2.5 px-2 py-1.5 rounded-md hover:bg-dark-700/60 cursor-pointer transition-colors group"
                  title={`${member.displayName || member.username} (Prawy klik dla opcji)`}
                >
                  <UserAvatar user={member} size="sm" statusOverride={status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-dark-200 group-hover:text-white truncate">
                      {member.displayName || member.username}
                    </div>
                    {member.customStatus && (
                      <div className="text-[10px] text-dark-400 truncate">
                        {member.customStatus}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MENU KONTEKSTOWE DLA UŻYTKOWNIKA (PPM na profil / członka) */}
      {userContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[190px] animate-fade-in text-dark-100"
          style={{
            top: Math.min(userContextMenu.y, window.innerHeight - 170),
            left: Math.min(userContextMenu.x, window.innerWidth - 200)
          }}
        >
          <div className="px-3 py-1.5 border-b border-dark-800 mb-1 flex items-center space-x-2">
            <UserAvatar user={userContextMenu.targetUser} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {userContextMenu.targetUser.displayName || userContextMenu.targetUser.username}
              </div>
              <div className="text-[10px] text-dark-400">@{userContextMenu.targetUser.username}</div>
            </div>
          </div>

          {/* Wiadomość prywatna */}
          {userContextMenu.targetUser.id !== user?.id && (
            <>
              <button
                onClick={() => {
                  if (onSelectDmUser) {
                    onSelectDmUser(userContextMenu.targetUser);
                  }
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
              >
                <MessageCircle size={14} />
                <span>Napisz wiadomość (PV)</span>
              </button>

              <button
                onClick={() => {
                  startDirectCall(userContextMenu.targetUser);
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
              >
                <Phone size={14} />
                <span>Zadzwoń na PV</span>
              </button>
            </>
          )}

          {/* Kopiuj Nick / ID */}
          <button
            onClick={() => {
              copyToClipboard(`@${userContextMenu.targetUser.username}`);
              setUserContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-dark-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="flex items-center space-x-2">
              <Copy size={14} />
              <span>Kopiuj nick</span>
            </span>
            {copiedText ? <Check size={14} className="text-emerald-400" /> : null}
          </button>
        </div>
      )}

      {/* MENU KONTEKSTOWE DLA WIADOMOŚCI (PPM na treść wiadomości) */}
      {msgContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[170px] animate-fade-in text-dark-100"
          style={{
            top: Math.min(msgContextMenu.y, window.innerHeight - 100),
            left: Math.min(msgContextMenu.x, window.innerWidth - 180)
          }}
        >
          <button
            onClick={() => {
              copyToClipboard(msgContextMenu.message.text);
              setMsgContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-dark-200 hover:bg-brand-500 hover:text-white rounded-lg transition-colors"
          >
            <Copy size={14} />
            <span>Kopiuj treść</span>
          </button>
        </div>
      )}
    </div>
  );
};
