/** Serializes receiver writes and bounds the amount of chunk data held in memory. */
export class ChunkWriteQueue {
  constructor(writeChunk, maxQueuedBytes) {
    if (typeof writeChunk !== 'function') {
      throw new TypeError('writeChunk must be a function')
    }
    if (!Number.isSafeInteger(maxQueuedBytes) || maxQueuedBytes <= 0) {
      throw new RangeError('maxQueuedBytes must be a positive safe integer')
    }

    this.writeChunk = writeChunk
    this.maxQueuedBytes = maxQueuedBytes
    this.queuedBytes = 0
    this.queue = []
    this.writing = false
    this.error = null
    this.idleWaiters = []
  }

  enqueue(offset, data) {
    if (this.error) return Promise.reject(this.error)
    if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
      return Promise.reject(new TypeError('Chunk data must be an ArrayBuffer or typed-array view'))
    }

    const byteLength = data.byteLength
    if (this.queuedBytes + byteLength > this.maxQueuedBytes) {
      return Promise.reject(new Error('Receiver write queue capacity exceeded'))
    }

    this.queuedBytes += byteLength
    const completion = new Promise((resolve, reject) => {
      this.queue.push({ offset, data, byteLength, resolve, reject })
    })
    this.drain()
    return completion
  }

  async drain() {
    if (this.writing) return
    this.writing = true

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()
        try {
          await this.writeChunk(item.offset, item.data)
          this.queuedBytes -= item.byteLength
          item.resolve()
        } catch (error) {
          const writeError = error instanceof Error ? error : new Error(String(error))
          this.queuedBytes -= item.byteLength
          item.reject(writeError)
          this.fail(writeError)
          return
        }
      }
    } finally {
      this.writing = false
      if (this.queue.length === 0) {
        for (const resolve of this.idleWaiters.splice(0)) resolve()
      }
    }
  }

  whenIdle() {
    if (!this.writing && this.queue.length === 0) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  fail(error) {
    this.error = error instanceof Error ? error : new Error(String(error))
    for (const item of this.queue.splice(0)) {
      this.queuedBytes -= item.byteLength
      item.reject(this.error)
    }
  }

  get pendingBytes() {
    return this.queuedBytes
  }
}
