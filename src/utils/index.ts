export const Utils = {
  // Generate random word
  getRandomWord: (length = 6): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('')
  },
  // Validate word format
  isValidWord: (word: string): boolean => {
    return /^[a-zA-Z0-9_]{4,20}$/.test(word)
  },
  // Convert bytes to human-readable file size
  humanReadableSize(size: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  },
  // Clear cookies
  clearCookies() {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  },
}

/**
 * Calculate smooth upload rate and remaining time
 * @param fileSize Total file size
 * @param uploadedBytes Uploaded bytes
 * @param speedHistory Speed history records
 * @returns Rate and remaining time information
 */
export function calculateUploadStats(
  fileSize: number,
  uploadedBytes: number,
  speedHistory: Array<{ timestamp: number; uploadedBytes: number }>
): {
  uploadSpeed: number
  remainingTime: number
} {
  // Cannot calculate rate with less than 2 points in history
  if (speedHistory.length < 2) {
    return {
      uploadSpeed: 0,
      remainingTime: 0,
    }
  }

  // Calculate average rate from recent points
  const speeds: number[] = []

  for (let i = 1; i < speedHistory.length; i++) {
    const prev = speedHistory[i - 1]
    const curr = speedHistory[i]
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000 // Convert to seconds
    const bytesDiff = curr.uploadedBytes - prev.uploadedBytes

    if (timeDiff > 0) {
      speeds.push(bytesDiff / timeDiff) // bytes/second
    }
  }

  // Calculate average rate
  const avgSpeed =
    speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0

  // Calculate remaining time
  const remainingBytes = fileSize - uploadedBytes
  const remainingTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0

  return {
    uploadSpeed: Math.max(0, avgSpeed),
    remainingTime: Math.max(0, remainingTime),
  }
}

/**
 * Update speed history records (keep last 5)
 * @param speedHistory Current history records
 * @param timestamp Timestamp
 * @param uploadedBytes Uploaded bytes
 * @returns Updated history records
 */
export function updateSpeedHistory(
  speedHistory: Array<{ timestamp: number; uploadedBytes: number }>,
  timestamp: number,
  uploadedBytes: number
): Array<{ timestamp: number; uploadedBytes: number }> {
  const newHistory = [...speedHistory, { timestamp, uploadedBytes }]

  // Keep last 5 records
  if (newHistory.length > 5) {
    newHistory.shift()
  }

  return newHistory
}

/**
 * Format upload rate display
 * @param bytesPerSecond Bytes per second
 * @returns Formatted rate string
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let size = bytesPerSecond
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format remaining time display
 * @param seconds Remaining seconds
 * @returns Formatted time string
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return 'Calculating...'

  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.ceil(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}
