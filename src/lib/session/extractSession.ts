/**
 * Session extraction from NextRequest
 *
 * Extracts identifying information (session ID, IP, user agent) from an incoming
 * HTTP request. This is data is used to build audit records and attribute actions
 * to request sessions.
 *
 * In Phase 1, sessions are ephemeral (no database). Phase 2 will link anonymous
 * sessions to authenticated users.
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Session context extracted from an HTTP request.
 * Used in all audit records to track who did what and when.
 */
export interface SessionContext {
  /** Unique session identifier — cookie in Phase 2+, or ephemeral in Phase 1 */
  sessionId: string
  /** Client IP address (best-effort from headers) */
  ip: string
  /** Client User-Agent header (truncated) */
  userAgent: string
}

/**
 * Extract session context from a Next.js server request.
 *
 * @param request - NextRequest object
 * @returns SessionContext with sessionId, ip, and userAgent
 *
 * Session ID strategy:
 * - Check for 'inflashield_session' cookie (set by middleware in Phase 2)
 * - If absent, generate crypto.randomUUID() — this is an ephemeral session for Phase 1
 *
 * IP extraction (in order of preference):
 * - x-forwarded-for header (when behind a reverse proxy)
 * - x-real-ip header (nginx, AWS ALB)
 * - fallback to 'unknown'
 *
 * User-Agent extraction:
 * - Full header value, truncated to 500 characters (prevent log bloat)
 * - Fallback to 'unknown'
 */
export function extractSession(request: NextRequest): SessionContext {
  // Extract session ID from cookie or generate ephemeral ID
  const cookieSessionId = request.cookies.get('inflashield_session')?.value
  const sessionId = cookieSessionId ?? randomUUID()

  // Extract IP address (best-effort from headers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  let ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown'

  // Sanity check: validate IP looks vaguely like an IPv4 or IPv6 address
  // If it doesn't match patterns, replace with unknown (could be spoofed header)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^[0-9a-f:]+$/i
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip) && ip !== 'unknown') {
    ip = 'unknown'
  }

  // Extract User-Agent (truncate to 500 characters)
  const userAgent = (request.headers.get('user-agent') ?? 'unknown').slice(0, 500)

  return {
    sessionId,
    ip,
    userAgent,
  }
}
