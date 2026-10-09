import { IconAlert, IconCheck } from '../icons/MessageIcons'
import { getDeliveryStatus } from '../../utils/messageDelivery'

export function MessageStatusTicks({ message, isMe, className = '' }) {
  if (!isMe) return null

  const status = getDeliveryStatus(message, isMe)

  if (status === 'failed') {
    return (
      <span className={`inline-flex items-center gap-0.5 text-rose-500 ${className}`} title="Failed to send">
        <IconAlert className="h-3.5 w-3.5" />
      </span>
    )
  }

  if (status === 'sending') {
    return (
      <span className={`inline-flex text-chat-muted dark:text-chat-mutedDark ${className}`} title="Sending">
        <span className="h-3.5 w-3.5 animate-pulse rounded-full border border-current opacity-60" />
      </span>
    )
  }

  const read = status === 'read'
  const delivered = status === 'delivered' || read

  return (
    <IconCheck
      double={delivered}
      className={`h-[14px] w-[14px] shrink-0 ${read ? 'text-chat-link dark:text-chat-linkDark' : 'text-chat-muted dark:text-chat-mutedDark'} ${className}`}
      title={read ? 'Read' : delivered ? 'Delivered' : 'Sent'}
    />
  )
}

export function MessageMetaRow({ time, message, isMe }) {
  return (
    <div className="mt-1 flex items-center justify-end gap-1 whitespace-nowrap text-[11px] leading-none text-chat-muted dark:text-chat-mutedDark">
      {message?.sendError && isMe ? (
        <span className="max-w-[140px] truncate text-[10px] text-rose-500" title={message.sendError}>
          {message.sendError}
        </span>
      ) : null}
      <span>{time}</span>
      <MessageStatusTicks message={message} isMe={isMe} />
    </div>
  )
}
