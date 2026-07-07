// IndexedDB store for transfer resume progress metadata
export class ResumeStore {
  constructor() {
    this.db = null
  }

  async init() {
    if (this.db) return
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('peershare-resume-db', 1)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('transfers')) {
          db.createObjectStore('transfers', { keyPath: 'transferId' })
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

  async getTransfer(transferId) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('transfers', 'readonly')
      const store = transaction.objectStore('transfers')
      const request = store.get(transferId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async saveTransfer(transferId, metadata, bitmaps) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('transfers', 'readwrite')
      const store = transaction.objectStore('transfers')
      
      const record = {
        transferId,
        metadata,
        bitmaps,
        timestamp: Date.now()
      }

      const request = store.put(record)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async deleteTransfer(transferId) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('transfers', 'readwrite')
      const store = transaction.objectStore('transfers')
      const request = store.delete(transferId)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async pruneOldTransfers(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('transfers', 'readwrite')
      const store = transaction.objectStore('transfers')
      const request = store.openCursor()
      const now = Date.now()

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          const record = cursor.value
          if (now - record.timestamp > maxAgeMs) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }
}

export const resumeStore = new ResumeStore()
// Run pruning in the background immediately
resumeStore.pruneOldTransfers().catch(err => {
  console.warn('[ResumeStore] Background pruning failed:', err)
})
