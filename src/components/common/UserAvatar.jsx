import React from 'react';

const statusColors = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-500',
  dnd: 'bg-red-500',
  offline: 'bg-neutral-500'
};

export const UserAvatar = ({
  user,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showStatus = true,
  statusOverride = null,
  isSpeaking = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl'
  };

  const statusSizeClasses = {
    sm: 'w-2.5 h-2.5 bottom-0 right-0 border',
    md: 'w-3.5 h-3.5 bottom-0 right-0 border-2',
    lg: 'w-4 h-4 bottom-0.5 right-0.5 border-2',
    xl: 'w-5 h-5 bottom-1 right-1 border-2'
  };

  const status = statusOverride || user?.status || 'offline';
  const avatarColor = user?.avatarColor || '#5865f2';
  const avatarEmoji = user?.avatarEmoji || '👤';
  const avatarUrl = user?.avatarUrl;
  const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : '?');

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}>
      {/* Obwódka mówienia (Zielony puls) */}
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white transition-all duration-150 overflow-hidden ${sizeClasses[size]} ${
          isSpeaking
            ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-dark-800 animate-pulse-glow'
            : ''
        }`}
        style={{ backgroundColor: avatarColor }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.displayName || user?.username || 'Avatar'}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : avatarEmoji && avatarEmoji !== '👤' ? (
          <span className="leading-none">{avatarEmoji}</span>
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Wskaźnik statusu online/idle/dnd/offline */}
      {showStatus && (
        <span
          className={`absolute rounded-full border-dark-900 ${statusSizeClasses[size]} ${
            statusColors[status] || 'bg-neutral-500'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
