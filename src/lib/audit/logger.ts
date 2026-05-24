/**
 * Audit logger —  Phase 1 & 2 compatible implementation
 *
 * Phase 1: Falls back to in-memory log if DATABASE_URL is not set
 * Phase 2: Writes to append-only database table
 *
 * Every meaningful action in InflaShield must be logged. The audit record
 * carries enough context to reconstruct the action and attribute it to a session.
 * Records are immutable once written — no update or delete operations.
 */

import { randomUUID } from 'crypto'
import { env } from '@/config/env'

/**
 * Audit record type (matches the database schema)
 */
export interface AuditRecord {
  /** UUID — never reused */
  id: string
  /** Session identifier (ephemeral in Phase 1, user ID in Phase 2+) */
  session_id: string
  /** Client IP address or 'server-side' for internal calls */
  ip_address: string
  /** The action performed, e.g. 'hedge_signal.create' */
  action: string
  /** Resource type (hedge_signal, order, etc.) — null for non-resource actions */
  resource_type: string | null
  /** Resource ID if applicable — null for non-resource actions */
  resource_id: string | null
  /** Outcome of the action: 'success' | 'failure' */
  outcome: 'success' | 'failure'
  /** Action-specific context: error messages, field names, status codes, etc. */
  metadata?: Record<string, unknown>
  /** Full User-Agent header (truncated to 500 chars) */
  user_agent: string
  /** ISO 8601 timestamp (generated server-side) */
  timestamp?: string // Optional for backward compatibility with Phase 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: In-memory fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-level in-memory audit log — used if DATABASE_URL is not set
 * Not exported; access only through readAuditLog().
 */
const inMemoryLog: AuditRecord[] = []

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Database-backed storage
// ─────────────────────────────────────────────────────────────────────────────

let auditRepository: any = null

async function getAuditRepository() {
  if (!auditRepository && env.DATABASE_URL) {
    try {
      const { AuditRepository } = await import('@/db/repositories/AuditRepository')
      auditRepository = AuditRepository.getInstance()
    } catch (error) {
      console.warn('[Audit] Failed to load AuditRepository, falling back to in-memory:', error)
      auditRepository = null
    }
  }
  return auditRepository
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write an audit record.
 * Automatically generates ID and server timestamp.
 * In Phase 1, writes to in-memory array.
 * In Phase 2, writes to append-only database table.
 *
 * This function NEVER throws — audit failures are logged but not re-thrown.
 * An audit write failure must never crash the application.
 *
 * @param record - Audit record without id/timestamp (generated here)
 */
export async function writeAudit(
  record: Omit<AuditRecord, 'id' | 'timestamp'>
): Promise<void> {
  const auditRecord: AuditRecord = {
    ...record,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  }

  // Try to write to database if configured
  const repo = await getAuditRepository()
  if (repo) {
    try {
      await repo.write({
        id: auditRecord.id,
        userId: auditRecord.session_id, // In Phase 2, session_id will be user_id
        sessionId: auditRecord.session_id,
        ipAddress: auditRecord.ip_address,
        userAgent: auditRecord.user_agent,
        action: auditRecord.action,
        resourceType: auditRecord.resource_type,
        resourceId: auditRecord.resource_id,
        outcome: auditRecord.outcome,
        metadata: auditRecord.metadata,
      })
      return
    } catch (error) {
      // Fall through to in-memory log
      console.warn('[Audit] Database write failed, using in-memory fallback:', error)
    }
  } else if (env.DATABASE_URL) {
    // Database is configured but repository failed to load
    console.warn('[Audit] Database configured but repository unavailable — using in-memory fallback')
  } else {
    // No database configured — Phase 1 mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit] Phase 1 mode: using in-memory audit log')
    }
  }

  // Fallback: in-memory storage
  inMemoryLog.push(auditRecord)
}

/**
 * Read audit records from in-memory log (Phase 1 only)
 * This is exposed for compatibility but should not be used in Phase 2+ for persistent audit.
 *
 * @param sessionId - If provided, filter by session ID. If omitted, return all.
 * @returns Array of audit records
 */
export function readAuditLog(sessionId?: string): AuditRecord[] {
  if (!sessionId) {
    return [...inMemoryLog]
  }
  return inMemoryLog.filter((record) => record.session_id === sessionId)
}

/**
 * Get the total number of in-memory audit records (for internal monitoring)
 * Not exposed to clients — internal only.
 *
 * In Phase 2, this only reflects in-memory records that failed to write to DB.
 */
export function getAuditLogSize(): number {
  return inMemoryLog.length
}

/**
 * Migration helper: check if database audit is configured
 * Returns true if DATABASE_URL is set and audit repository is available
 */
export async function isDatabaseAuditConfigured(): Promise<boolean> {
  if (!env.DATABASE_URL) {
    return false
  }
  const repo = await getAuditRepository()
  return repo !== null
}

