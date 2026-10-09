import React from 'react'

export const avatarHue = (seed = '') => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  const hues = [168, 199, 142, 262, 24, 340]
  return hues[Math.abs(hash) % hues.length]
}

export function UserAvatar({ userId, avatarUrl, online, size = 'md', className = '' }) {
  const hue = avatarHue(userId || 'x')
  const dim =
    size === 'header'
      ? 'h-10 w-10 text-sm'
      : size === 'sm'
        ? 'h-12 w-12 text-sm'
        : 'h-[49px] w-[49px] text-base'
  const showOnline = online !== undefined

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={`${dim} rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10`}
        />
      ) : (
        <div
          className={`grid ${dim} place-items-center rounded-full font-semibold text-white`}
          style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue} 65% 32%))` }}
        >
          {(userId || '?').slice(0, 2).toUpperCase()}
        </div>
      )}
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-chat-sidebar dark:border-chat-sidebarDark ${
            online ? 'bg-indigo-400' : 'bg-chat-muted'
          }`}
        />
      )}
    </div>
  )
}
