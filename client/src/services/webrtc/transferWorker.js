// Web Worker managing file slicing, chunking, priority scheduling, and channel routing.
let files = [] // Array of File/Blob objects
let transferId = ''
let transferIdHash = 0n
let chunkSize = 64 * 1024
const BLOCK_SIZE = 4 * 1024 * 1024 // 4 MB blocks

// Send queue and state
let activeCount = 4
let channelStats = []
let isReading = false

// File tracking state: array of { nextOffset, chunkIndex, totalChunks, isDone }
let fileStates = []

// Retransmission priority queue: array of { fileIndex, chunkIndex, offset, length }
let retransmitQueue = []

// FNV-1a 64-bit hash
function fnv1a64(str) {
  let hVal = 0xcbf29ce484222325n
  for (let i = 0; i < str.length; i++) {
    hVal ^= BigInt(str.charCodeAt(i))
    hVal = (hVal * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return hVal
}

self.onmessage = async (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'init':
      files = payload.files
      transferId = payload.transferId
      transferIdHash = fnv1a64(transferId)
      chunkSize = payload.chunkSize || 64 * 1024
      activeCount = payload.activeCount || 4

      fileStates = files.map(f => ({
        nextOffset: 0,
        chunkIndex: 0,
        totalChunks: Math.ceil(f.size / chunkSize),
        isDone: false
      }))
      retransmitQueue = []
      channelStats = Array.from({ length: activeCount }, (_, idx) => ({
        index: idx,
        bufferedAmount: 0,
        growthSpeed: 0,
        isStalled: false
      }))

      // Pre-calculate SHA-256 block hashes for verification on the receiver side
      calculateBlockHashes()
      break

    case 'update-channel-stats':
      // payload: array of { index, bufferedAmount, growthSpeed, isStalled }
      if (payload && Array.isArray(payload)) {
        payload.forEach(stat => {
          if (channelStats[stat.index]) {
            Object.assign(channelStats[stat.index], stat)
          }
        })
      }
      break

    case 'update-active-count':
      activeCount = payload.activeCount
      break

    case 'nack-blocks':
      // NACK payload: { fileIndex, blockIndex }
      queueBlockRetransmissions(payload.fileIndex, payload.blockIndex)
      // Flush priority queue immediately
      readAndSendNext()
      break

    case 'request-chunks':
      // Request for more chunks
      if (!isReading) {
        readAndSendNext()
      }
      break
  }
}

async function calculateBlockHashes() {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const blockCount = Math.ceil(file.size / BLOCK_SIZE)
    const hashes = []

    for (let b = 0; b < blockCount; b++) {
      const start = b * BLOCK_SIZE
      const end = Math.min(start + BLOCK_SIZE, file.size)
      const slice = file.slice(start, end)
      
      try {
        const buffer = await slice.arrayBuffer()
        const hashBuffer = await self.crypto.subtle.digest('SHA-256', buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        hashes.push(hexHash)
      } catch (err) {
        console.error('[TransferWorker] Failed block hash calculation:', err)
        hashes.push('')
      }
    }

    self.postMessage({
      type: 'block-hashes',
      payload: {
        fileIndex: i,
        hashes
      }
    })
  }
}

function queueBlockRetransmissions(fileIndex, blockIndex) {
  const file = files[fileIndex]
  if (!file) return

  const blockStart = blockIndex * BLOCK_SIZE
  const blockEnd = Math.min(blockStart + BLOCK_SIZE, file.size)
  
  let offset = blockStart
  let chunkIdx = Math.floor(blockStart / chunkSize)

  while (offset < blockEnd) {
    const length = Math.min(chunkSize, blockEnd - offset)
    retransmitQueue.push({
      fileIndex,
      chunkIndex: chunkIdx,
      offset,
      length
    })
    offset += length
    chunkIdx++
  }
}

function getRouteTargetChannel() {
  // Candidate channels restricted to the activeCount pool size
  const enabledChannels = channelStats.slice(0, activeCount)
  
  // Filter out stalled channels if possible
  const activeChannels = enabledChannels.filter(c => !c.isStalled)
  const candidates = activeChannels.length > 0 ? activeChannels : enabledChannels

  if (candidates.length === 0) return 0

  // Route to the channel with the lowest bufferedAmount and growth rate
  candidates.sort((a, b) => {
    if (a.bufferedAmount !== b.bufferedAmount) {
      return a.bufferedAmount - b.bufferedAmount
    }
    return a.growthSpeed - b.growthSpeed
  })

  return candidates[0].index
}

async function readAndSendNext() {
  isReading = true

  // Read up to 8 chunks concurrently or sequentially to fill BDP pipeline
  for (let i = 0; i < 8; i++) {
    let nextChunk = null
    let isRetransmit = false

    // 1. Check retransmission queue first
    if (retransmitQueue.length > 0) {
      nextChunk = retransmitQueue.shift()
      isRetransmit = true
    } else {
      // 2. Find the next file that isn't finished
      let activeFileIdx = -1
      for (let f = 0; f < files.length; f++) {
        if (!fileStates[f].isDone) {
          activeFileIdx = f
          break
        }
      }

      if (activeFileIdx === -1) {
        // All files fully sent
        self.postMessage({ type: 'all-sent' })
        isReading = false
        return
      }

      const file = files[activeFileIdx]
      const state = fileStates[activeFileIdx]

      nextChunk = {
        fileIndex: activeFileIdx,
        chunkIndex: state.chunkIndex,
        offset: state.nextOffset,
        length: Math.min(chunkSize, file.size - state.nextOffset)
      }

      // Update state
      state.nextOffset += nextChunk.length
      state.chunkIndex++
      if (state.nextOffset >= file.size) {
        state.isDone = true
      }
    }

    if (nextChunk) {
      const file = files[nextChunk.fileIndex]
      const slice = file.slice(nextChunk.offset, nextChunk.offset + nextChunk.length)

      try {
        const buffer = await slice.arrayBuffer()
        
        // Construct 34-byte header
        const packet = new ArrayBuffer(34 + buffer.byteLength)
        const view = new DataView(packet)
        
        // 0: Magic
        view.setUint32(0, 0x50534254, true)
        // 4: Version
        view.setUint8(4, 1)
        // 5: Flags
        let flags = 0
        if (nextChunk.offset === 0 && !isRetransmit) flags |= 0x01 // First chunk
        if (nextChunk.offset + nextChunk.length >= file.size && !isRetransmit) flags |= 0x02 // Last chunk
        if (isRetransmit) flags |= 0x04 // Retransmit
        view.setUint8(5, flags)
        // 6: Reserved
        view.setUint16(6, 0, true)
        // 8: Transfer ID Hash (uint64)
        view.setBigUint64(8, transferIdHash, true)
        // 16: File ID Index (uint16)
        view.setUint16(16, nextChunk.fileIndex, true)
        // 18: Chunk Index (uint32)
        view.setUint32(18, nextChunk.chunkIndex, true)
        // 22: Payload Length (uint32)
        view.setUint32(22, nextChunk.length, true)
        // 26: File Offset (uint64)
        view.setBigUint64(26, BigInt(nextChunk.offset), true)

        // Copy chunk payload into packet buffer
        new Uint8Array(packet, 34).set(new Uint8Array(buffer))

        // Get targeted channel index
        const targetChannelIndex = getRouteTargetChannel()

        // Post back to main thread with transferable object
        self.postMessage({
          type: 'chunk',
          payload: {
            buffer,
            packet,
            length: nextChunk.length,
            targetChannelIndex,
            isRetransmit,
            fileIndex: nextChunk.fileIndex,
            offset: nextChunk.offset
          }
        }, [packet])
      } catch (err) {
        console.error('[TransferWorker] Slicing error:', err)
      }
    }
  }

  isReading = false
}
