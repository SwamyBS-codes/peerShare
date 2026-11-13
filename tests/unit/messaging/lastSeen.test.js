import { describe, expect, it } from 'vitest'
import { formatLastSeen } from '../../../client/src/utils/lastSeen.js'

describe('last seen labels', () => {
  const now = Date.parse('2026-11-13T12:00:00.000Z')

  it('formats recent activity as relative time', () => {
    expect(formatLastSeen(now - 2 * 60_000, now)).toBe('last seen 2 minutes ago')
    expect(formatLastSeen(now - 3 * 60 * 60_000, now)).toBe('last seen 3 hours ago')
    expect(formatLastSeen(now - 2 * 24 * 60 * 60_000, now)).toBe('last seen 2 days ago')
  })

  it('shows a date for older activity', () => {
    expect(formatLastSeen('2026-10-01T12:00:00.000Z', now)).toMatch(/^last seen /)
  })

  it('handles missing or invalid timestamps explicitly', () => {
    expect(formatLastSeen(null, now)).toBe('last seen unavailable')
    expect(formatLastSeen('not-a-date', now)).toBe('last seen unavailable')
  })
})
