/**
 * Lightweight error handling
 * One function handles all error processing, keeping it simple
 */

/**
 * Unified error handling function
 * @param error Any type of error object
 * @returns User-friendly error message
 */
export function handleError(error: any): string {
  // Network connection failure
  if (!error.response) {
    return 'Network connection failed, please check your network connection'
  }

  // HTTP status code errors
  const status = error.response.status

  // Authentication related errors
  if (status === 401 || status === 403) {
    return 'Access denied, please check password or permissions'
  }

  // File size exceeded
  if (status === 413) {
    return 'File too large, please select a smaller file'
  }

  // Request timeout
  if (status === 408) {
    return 'Request timeout, please try again'
  }

  // Server errors
  if (status >= 500) {
    return 'Server error, please try again later'
  }

  // User cancelled operation
  if (error.name === 'AbortError') {
    return 'Operation cancelled'
  }

  // Return server-provided error message, or default message
  return error.response?.data?.msg ||
         error.response?.data?.message ||
         error.message ||
         'Operation failed, please try again'
}
