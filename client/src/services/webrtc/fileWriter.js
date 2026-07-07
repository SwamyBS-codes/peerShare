
export class FileWriter {
  constructor(fileId, name, size, mimeType, options = {}) {
    this.fileId = fileId
    this.name = name
    this.size = size
    this.mimeType = mimeType || 'application/octet-stream'
    this.options = options

    this.type = 'ram' // 'fsa' | 'opfs' | 'indexeddb' | 'ram'
    this.handle = null
    this.writable = null

    // For Sequential Buffered Writing Fallback
    this.isSequentialOnly = false
    this.nextWriteOffset = 0
    this.bufferedChunks = new Map() // offset -> ArrayBuffer
    this.bufferedBytes = 0
    this.maxBufferSize = 16 * 1024 * 1024 // 16 MB max cache buffer

    // Fallbacks
    this.ramChunks = []
    this.db = null
    this.idbStoreName = `chunks_${this.fileId.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  async init(fsaHandle = null) {
    // Try FSA first if handle is provided
    if (fsaHandle) {
      try {
        this.handle = fsaHandle
        this.writable = await fsaHandle.createWritable()
        this.type = 'fsa'
        await this.verifyRandomWriteCapability()
        return
      } catch (err) {
        console.warn('[FileWriter] FSA initialization failed, falling back to OPFS:', err)
      }
    }

    // Try OPFS next
    try {
      if (navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory()
        // Create a unique temporary filename in OPFS
        const tempName = `.temp_${this.fileId.replace(/[^a-zA-Z0-9]/g, '_')}`
        this.handle = await root.getFileHandle(tempName, { create: true })
        
        // Use createWritable if supported, otherwise accessHandle (workers only)
        if (typeof this.handle.createWritable === 'function') {
          this.writable = await this.handle.createWritable()
          this.type = 'opfs'
          await this.verifyRandomWriteCapability()
          return
        }
      }
    } catch (err) {
      console.warn('[FileWriter] OPFS initialization failed, falling back to IndexedDB:', err)
    }

    // Try IndexedDB
    try {
      this.type = 'indexeddb'
      await this.initIndexedDB()
      return
    } catch (err) {
      console.warn('[FileWriter] IndexedDB initialization failed, falling back to RAM:', err)
    }

    // Fallback to RAM
    this.type = 'ram'
    this.ramChunks = []
  }

  async verifyRandomWriteCapability() {
    try {
      // Test random write capability: write to offset 10, then offset 0
      if (this.writable && typeof this.writable.write === 'function') {
        const testData = new Uint8Array([1, 2, 3])
        await this.writable.write({ type: 'write', position: 10, data: testData })
        await this.writable.write({ type: 'write', position: 0, data: testData })
        this.isSequentialOnly = false
      }
    } catch (err) {
      console.warn('[FileWriter] Random write test failed. Enabling sequential-only mode.', err)
      this.isSequentialOnly = true
      this.nextWriteOffset = 0
      // Re-create writable if test corrupted it
      if (this.type === 'fsa' || this.type === 'opfs') {
        try {
          await this.writable.close()
        } catch {
          // Ignore if already closed or failing
        }
        this.writable = await this.handle.createWritable({ keepExistingData: false })
      }
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`peershare-writer-${this.fileId.replace(/[^a-zA-Z0-9]/g, '_')}`, 1)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'offset' })
        }
      }
      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve()
      }
      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  async write(offset, data) {
    if (this.isSequentialOnly) {
      return this.writeSequential(offset, data)
    }

    return this.writeDirect(offset, data)
  }

  async writeDirect(offset, data) {
    switch (this.type) {
      case 'fsa':
      case 'opfs':
        if (this.writable) {
          await this.writable.write({ type: 'write', position: offset, data })
        }
        break

      case 'indexeddb':
        await this.writeToIndexedDB(offset, data)
        break

      case 'ram':
      default:
        this.ramChunks.push({ offset, data })
        break
    }
  }

  async writeSequential(offset, data) {
    // If chunk matches expected offset, write it directly
    if (offset === this.nextWriteOffset) {
      await this.writeDirect(offset, data)
      this.nextWriteOffset += data.byteLength

      // Process subsequent cached chunks that are now sequential
      while (this.bufferedChunks.has(this.nextWriteOffset)) {
        const nextData = this.bufferedChunks.get(this.nextWriteOffset)
        this.bufferedChunks.delete(this.nextWriteOffset)
        this.bufferedBytes -= nextData.byteLength

        await this.writeDirect(this.nextWriteOffset, nextData)
        this.nextWriteOffset += nextData.byteLength
      }
    } else if (offset > this.nextWriteOffset) {
      // Out of order: cache it
      if (!this.bufferedChunks.has(offset)) {
        this.bufferedChunks.set(offset, data)
        this.bufferedBytes += data.byteLength
      }

      // Backpressure: If memory exceeds threshold, wait a bit for missing chunks to arrive
      if (this.bufferedBytes > this.maxBufferSize) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    // Ignore chunks that are < nextWriteOffset (duplicate retransmits)
  }

  async writeToIndexedDB(offset, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('chunks', 'readwrite')
      const store = transaction.objectStore('chunks')
      // Store data as a blob or arraybuffer
      const request = store.put({ offset, data })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async close() {
    // Flush any remaining buffered chunks (should be empty if completed successfully)
    if (this.isSequentialOnly && this.bufferedChunks.size > 0) {
      const sortedOffsets = Array.from(this.bufferedChunks.keys()).sort((a, b) => a - b)
      for (const offset of sortedOffsets) {
        const data = this.bufferedChunks.get(offset)
        await this.writeDirect(offset, data)
      }
      this.bufferedChunks.clear()
      this.bufferedBytes = 0
    }

    if (this.writable) {
      await this.writable.close()
      this.writable = null
    }

    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async getFileBlob() {
    if (this.type === 'fsa') {
      return await this.handle.getFile()
    }

    if (this.type === 'opfs') {
      return await this.handle.getFile()
    }

    if (this.type === 'indexeddb') {
      return await this.reconstructFileFromIndexedDB()
    }

    // RAM fallback
    // Sort ram chunks by offset and combine
    this.ramChunks.sort((a, b) => a.offset - b.offset)
    const blobs = this.ramChunks.map(c => c.data)
    return new Blob(blobs, { type: this.mimeType })
  }

  async streamTo(writableStream) {
    const writer = writableStream.getWriter()
    try {
      if (this.type === 'fsa' || this.type === 'opfs') {
        const file = await this.handle.getFile()
        const reader = file.stream().getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(value)
        }
      } else if (this.type === 'indexeddb') {
        const offsets = await this.getAllIndexedDBOffsets()
        for (const offset of offsets) {
          const chunkData = await this.readChunkFromIndexedDB(offset)
          if (chunkData) {
            await writer.write(chunkData)
          }
        }
      } else {
        // RAM fallback
        this.ramChunks.sort((a, b) => a.offset - b.offset)
        for (const chunk of this.ramChunks) {
          await writer.write(chunk.data)
        }
      }
      await writer.close()
    } catch (err) {
      try {
        await writer.abort(err)
      } catch {
        // Ignore write-abort errors if stream is already closed/errored
      }
      throw err
    }
  }

  async getAllIndexedDBOffsets() {
    await this.initIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('chunks', 'readonly')
      const store = transaction.objectStore('chunks')
      const request = store.getAllKeys()
      request.onsuccess = () => {
        const keys = request.result || []
        keys.sort((a, b) => a - b)
        resolve(keys)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async readChunkFromIndexedDB(offset) {
    await this.initIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('chunks', 'readonly')
      const store = transaction.objectStore('chunks')
      const request = store.get(offset)
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async reconstructFileFromIndexedDB() {
    await this.initIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('chunks', 'readonly')
      const store = transaction.objectStore('chunks')
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result || []
        // Sort records by offset
        records.sort((a, b) => a.offset - b.offset)
        const blobs = records.map(r => r.data)
        resolve(new Blob(blobs, { type: this.mimeType }))
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async cleanup() {
    try {
      await this.close()
    } catch {
      // Ignore errors on closing during cleanup
    }

    if (this.type === 'opfs' && this.handle) {
      try {
        const root = await navigator.storage.getDirectory()
        const tempName = `.temp_${this.fileId.replace(/[^a-zA-Z0-9]/g, '_')}`
        await root.removeEntry(tempName)
      } catch (err) {
        console.warn('[FileWriter] Cleanup removal from OPFS failed:', err)
      }
    }

    if (this.type === 'indexeddb') {
      try {
        const dbName = `peershare-writer-${this.fileId.replace(/[^a-zA-Z0-9]/g, '_')}`
        indexedDB.deleteDatabase(dbName)
      } catch (err) {
        console.warn('[FileWriter] Cleanup IndexedDB failed:', err)
      }
    }

    this.ramChunks = []
    this.bufferedChunks.clear()
    this.bufferedBytes = 0
  }
}
