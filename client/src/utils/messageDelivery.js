/** @typedef {'sending' | 'sent' | 'delivered' | 'read' | 'failed'} DeliveryStatus */

export function getDeliveryStatus(message, isMe) {
  if (!isMe) return null
  const fromMeta = message?.metadata?.deliveryStatus
  if (fromMeta) return fromMeta
  if (message?.sendError) return 'failed'
  if (message?.id?.startsWith?.('temp-') || message?.id?.startsWith?.('voice-')) return 'sending'
  return 'sent'
}

export function mergeDeliveryMetadata(message, status) {
  return {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      deliveryStatus: status,
    },
  }
}
