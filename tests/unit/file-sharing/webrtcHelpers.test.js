import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  createFileId,
  createTransferId,
  normalizeChunkSize,
} from '../../../client/src/services/webrtc/helpers.js'
import { DataChannelHandler } from '../../../client/src/services/webrtc/dataChannelHandler.js'

describe('WebRTC file transfer helpers', () => {
  it('bounds and normalizes chunk sizes', () => {
    expect(normalizeChunkSize(Number.NaN)).toBe(DEFAULT_CHUNK_SIZE)
    expect(normalizeChunkSize(MIN_CHUNK_SIZE - 1)).toBe(MIN_CHUNK_SIZE)
    expect(normalizeChunkSize(MAX_CHUNK_SIZE + 1)).toBe(MAX_CHUNK_SIZE)
    expect(normalizeChunkSize(8192.9)).toBe(8192)
  })

  it('builds deterministic file and transfer identifiers from metadata', () => {
    const files = [
      { name: 'sample.txt', size: 12, lastModified: 100 },
      { name: 'second.pdf', size: 20, lastModified: 200 },
    ]
    expect(createFileId(files[0], 0)).toBe('0:sample.txt:12:100')
    expect(createTransferId(files)).toBe('transfer:0:sample.txt:12:100|1:second.pdf:20:200')
  })

  it('parses a framed binary file chunk and passes its payload to the receiver', () => {
    const onBinaryFrame = vi.fn()
    const service = {
      peers: new Map(),
      handlers: { onBinaryFrame },
      routeMonitor: { startRouteMonitor: vi.fn(), stopRouteMonitor: vi.fn() },
      connectionManager: { resolveChannelWaiters: vi.fn() },
    }
    const channel = { label: 'peershare-control' }
    const handler = new DataChannelHandler(service)
    handler.attachDataChannel('peer-1', channel)

    const frame = new ArrayBuffer(37)
    const view = new DataView(frame)
    view.setUint32(0, 0x50534254, true)
    view.setUint8(4, 1)
    view.setUint8(5, 2)
    view.setUint16(16, 3, true)
    view.setUint32(18, 7, true)
    view.setUint32(22, 3, true)
    view.setBigUint64(26, 42n, true)
    new Uint8Array(frame, 34).set([1, 2, 3])

    channel.onmessage({ data: frame })

    expect(onBinaryFrame).toHaveBeenCalledWith('peer-1', expect.objectContaining({
      magic: 0x50534254,
      version: 1,
      flags: 2,
      fileIdIndex: 3,
      chunkIndex: 7,
      length: 3,
      offset: 42,
      payload: frame.slice(34),
    }))
  })
})
