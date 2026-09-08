// writerWorker.js - Synchronous File Writer Worker using OPFS SyncAccessHandle
let accessHandle = null

self.onmessage = async (event) => {
  const { type, payload } = event.data

  if (type === 'init') {
    const { fileHandle, size } = payload
    try {
      // Open the synchronous access handle (only works inside a worker context)
      accessHandle = await fileHandle.createSyncAccessHandle()
      // Pre-allocate the entire file size to optimize out-of-order block writing
      accessHandle.truncate(size)
      self.postMessage({ type: 'initialized' })
    } catch (err) {
      self.postMessage({ type: 'error', error: `createSyncAccessHandle failed: ${err.message}` })
    }
  }

  else if (type === 'write') {
    const { offset, data } = payload
    try {
      if (!accessHandle) {
        throw new Error('Writer not initialized or already closed')
      }
      
      // Ensure we have a Uint8Array view for writing
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer || data)
      accessHandle.write(bytes, { at: offset })

      // Safely determine transfer list for posting back
      const transferList = []
      if (data instanceof ArrayBuffer) {
        transferList.push(data)
      } else if (data && data.buffer instanceof ArrayBuffer) {
        transferList.push(data.buffer)
      }

      self.postMessage({ type: 'write-ack', offset, data }, transferList)
    } catch (err) {
      self.postMessage({ type: 'error', error: `write failed: ${err.message}` })
    }
  }

  else if (type === 'close') {
    try {
      if (accessHandle) {
        accessHandle.flush()
        accessHandle.close()
        accessHandle = null
      }
      self.postMessage({ type: 'closed' })
    } catch (err) {
      self.postMessage({ type: 'error', error: `close failed: ${err.message}` })
    }
  }
}
