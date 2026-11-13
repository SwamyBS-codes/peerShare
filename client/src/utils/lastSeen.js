const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatLastSeen(lastSeenAt, now = Date.now()) {
  if (!lastSeenAt) return 'last seen unavailable'

  const timestamp = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(timestamp)) return 'last seen unavailable'

  const elapsedMinutes = Math.floor(Math.max(0, now - timestamp) / 60_000)
  if (elapsedMinutes < 1) return 'last seen just now'
  if (elapsedMinutes < 60) {
    return `last seen ${relativeTimeFormatter.format(-elapsedMinutes, 'minute')}`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return `last seen ${relativeTimeFormatter.format(-elapsedHours, 'hour')}`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 7) {
    return `last seen ${relativeTimeFormatter.format(-elapsedDays, 'day')}`
  }

  return `last seen ${dateFormatter.format(timestamp)}`
}
