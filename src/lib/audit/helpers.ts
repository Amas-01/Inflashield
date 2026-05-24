/**
 * Audit helper utilities
 */

import { NextRequest } from 'next/server'

/**
 * Extract client IP address from NextRequest
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Extract user agent from NextRequest
 */
export function getUserAgent(request: NextRequest): string {
  const ua = request.headers.get('user-agent') || 'unknown'
  // Truncate to 500 chars per schema
  return ua.substring(0, 500)
}
