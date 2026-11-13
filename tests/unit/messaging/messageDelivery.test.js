import { describe, expect, it } from 'vitest'
import { getDeliveryStatus, mergeDeliveryMetadata } from '../../../client/src/utils/messageDelivery.js'

describe('message delivery status', () => {
  it('only displays delivery state for messages sent by the current user', () => {
    expect(getDeliveryStatus({ metadata: { deliveryStatus: 'read' } }, false)).toBeNull()
  })

  it('prefers the explicit status, then local send state, then sent', () => {
    expect(getDeliveryStatus({ metadata: { deliveryStatus: 'delivered' }, sendError: true }, true)).toBe('delivered')
    expect(getDeliveryStatus({ sendError: 'offline' }, true)).toBe('failed')
    expect(getDeliveryStatus({ id: 'temp-123' }, true)).toBe('sending')
    expect(getDeliveryStatus({ id: 'voice-123' }, true)).toBe('sending')
    expect(getDeliveryStatus({ id: 'persisted-id' }, true)).toBe('sent')
  })

  it('merges delivery metadata without dropping existing fields', () => {
    const message = { content: 'hello', metadata: { clientMessageId: 'message-1' } }
    expect(mergeDeliveryMetadata(message, 'read')).toEqual({
      content: 'hello',
      metadata: { clientMessageId: 'message-1', deliveryStatus: 'read' },
    })
  })
})
