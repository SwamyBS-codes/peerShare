export const DEFAULT_CHUNK_SIZE = 64 * 1024
export const MIN_CHUNK_SIZE = 4 * 1024
export const MAX_CHUNK_SIZE = 1024 * 1024
export const INITIAL_ACK_TIMEOUT_MS = 2200
export const CHANNEL_WAIT_TIMEOUT_MS = 12000

export const PROTOCOL_MAGIC = 0x50534254 // 'PSBT'
export const PROTOCOL_VERSION = 1

export function createFileId(file, index) {
  return `${index}:${file.name}:${file.size}:${file.lastModified}`
}

export function createTransferId(files) {
  const signature = files
    .map((file, index) => createFileId(file, index))
    .join('|')
  return `transfer:${signature}`
}

export function normalizeChunkSize(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHUNK_SIZE
  }
  return Math.min(Math.max(Math.floor(value), MIN_CHUNK_SIZE), MAX_CHUNK_SIZE)
}

export function fnv1a64(str) {
  let hVal = 0xcbf29ce484222325n
  for (let i = 0; i < str.length; i++) {
    hVal ^= BigInt(str.charCodeAt(i))
    hVal = (hVal * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return hVal.toString(16).padStart(16, '0')
}

export function detectBrowser() {
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Chrome'
}

