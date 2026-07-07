// Web Worker for background block hash verification using the Web Crypto API
self.onmessage = async (event) => {
  const { type, fileId, blockIndex, data, expectedHash } = event.data

  if (type === 'verify-block') {
    try {
      // Calculate SHA-256 using Web Crypto API
      const hashBuffer = await self.crypto.subtle.digest('SHA-256', data)
      
      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const isValid = computedHash === expectedHash

      self.postMessage({
        type: 'verify-result',
        fileId,
        blockIndex,
        isValid,
        computedHash,
        expectedHash
      })
    } catch (err) {
      self.postMessage({
        type: 'verify-result',
        fileId,
        blockIndex,
        isValid: false,
        computedHash: '',
        expectedHash,
        error: err.message
      })
    }
  }
}
