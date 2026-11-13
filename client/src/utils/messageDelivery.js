// Resolves message delivery state for the chat UI and keeps status updates in metadata.
/** @typedef {'sending' | 'sent' | 'delivered' | 'read' | 'failed'} DeliveryStatus */

/** Returns the sender-visible delivery status, or null for messages sent by another user. */
export function getDeliveryStatus(message, isMe) {
  if (!isMe) return null
  const fromMeta = message?.metadata?.deliveryStatus
  if (fromMeta) return fromMeta
  if (message?.sendError) return 'failed'
  if (message?.id?.startsWith?.('temp-') || message?.id?.startsWith?.('voice-')) return 'sending'
  return 'sent'
}

/** Copies a message with its delivery status merged into existing metadata. */
export function mergeDeliveryMetadata(message, status) {
  return {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      deliveryStatus: status,
    },
  }
}
