/**
 * Generate unique request ID
 * Format: timestamp-random-userId
 */
export function generateRequestId(userId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userPart = userId ? `-${userId}` : '';
  return `${timestamp}-${random}${userPart}`;
}

/**
 * Validate request ID format
 */
export function isValidRequestId(requestId: string): boolean {
  if (!requestId || typeof requestId !== 'string') {
    return false;
  }
  
  // Check length
  if (requestId.length < 10 || requestId.length > 255) {
    return false;
  }
  
  // Check format: timestamp-random or timestamp-random-userId
  const parts = requestId.split('-');
  if (parts.length < 2) {
    return false;
  }
  
  // First part should be timestamp (number)
  const timestamp = parseInt(parts[0]);
  if (isNaN(timestamp) || timestamp <= 0) {
    return false;
  }
  
  return true;
}
