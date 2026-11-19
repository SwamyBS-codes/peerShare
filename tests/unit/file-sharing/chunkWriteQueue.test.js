import { describe, expect, it, vi } from 'vitest'
import { ChunkWriteQueue } from '../../../client/src/services/webrtc/chunkWriteQueue.js'

describe('ChunkWriteQueue', () => {
  it('writes chunks in order and releases queued capacity after persistence', async () => {
    const writes = []
    let releaseFirstWrite
    const writeChunk = vi.fn(async (offset, data) => {
      if (offset === 0) await new Promise((resolve) => { releaseFirstWrite = resolve })
      writes.push({ offset, data: [...new Uint8Array(data)] })
    })
    const queue = new ChunkWriteQueue(writeChunk, 4)
    const first = queue.enqueue(0, new Uint8Array([1, 2]).buffer)
    const second = queue.enqueue(2, new Uint8Array([3, 4]).buffer)

    expect(queue.pendingBytes).toBe(4)
    await expect(queue.enqueue(4, new Uint8Array([5]).buffer))
      .rejects.toThrow('Receiver write queue capacity exceeded')

    releaseFirstWrite()
    await Promise.all([first, second])

    expect(writes).toEqual([
      { offset: 0, data: [1, 2] },
      { offset: 2, data: [3, 4] },
    ])
    expect(queue.pendingBytes).toBe(0)
  })

  it('rejects queued writes when the storage writer fails', async () => {
    const writeError = new Error('disk write failed')
    const writeChunk = vi.fn(async (offset) => {
      if (offset === 0) throw writeError
    })
    const queue = new ChunkWriteQueue(writeChunk, 8)
    const first = queue.enqueue(0, new Uint8Array([1]).buffer)
    const second = queue.enqueue(1, new Uint8Array([2]).buffer)

    await expect(first).rejects.toBe(writeError)
    await expect(second).rejects.toBe(writeError)
    await expect(queue.enqueue(2, new Uint8Array([3]).buffer)).rejects.toBe(writeError)
    expect(queue.pendingBytes).toBe(0)
    expect(writeChunk).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid limits and chunk data', async () => {
    expect(() => new ChunkWriteQueue(() => {}, 0)).toThrow(RangeError)
    const queue = new ChunkWriteQueue(() => Promise.resolve(), 8)

    await expect(queue.enqueue(0, 'not binary')).rejects.toThrow(
      'Chunk data must be an ArrayBuffer or typed-array view'
    )
  })
})
