export const DEFAULT_CHUNK_SIZE = 64 * 1024
export const MIN_CHUNK_SIZE = 4 * 1024
export const MAX_CHUNK_SIZE = 1024 * 1024
export const INITIAL_ACK_TIMEOUT_MS = 2200
export const CHANNEL_WAIT_TIMEOUT_MS = 12000

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
