/**
 * Audit logger — Phase 1 implementation
 *
 * Phase 1: in-memory log (server process memory, lost on restart)
 * Phase 2: replace with append-only database table, separate from application data
 *
 * Every meaningful action in InflaShield must be logged. The audit record
 * carries enough context to reconstruct the action and attribute it to a session.
 * Records are immutable once written — no update or delete operations.
 */

import { randomUUID } from 'crypto'

/**
 * Immutable audit record schema.
 * Every field is required except resource_id (null for non-resource actions).
 */
export interface AuditRecord {
  /** UUID — never reused */
  id: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Session identifier (anonymous in Phase 1, user ID in Phase 2+) */
  session_id: string
  /** Client IP address or 'server-side' for internal calls */
  ip_address: string
  /** The action performed, e.g. 'hedge_signal.create' */
  action: string
  /** Resource type (hedge_signal, order, etc.) — null for non-resource actions */
  resource_type: string | null
  /** Resource ID if applicable — null for non-resource actions */
  resource_id: string | null
  /** Outcome of the action */
  outcome: 'success' | 'failure'
  /** Action-specific context: error messages, field names, status codes, etc. */
  metadata: Record<string, unknown>
  /** Full User-Agent header (truncated to 500 chars) */
  user_agent: string
}

/**
 * Module-level audit log — array, not exported.
 * Access only through readAuditLog().
 */
const auditLog: AuditRecord[] = []

/**
 * Write an audit record. Record receives an auto-generated UUID and ISO timestamp.
 *
 * @param record - Omit id and timestamp; they are generated here
 */
export function writeAudit(record: Omit<AuditRecord, 'id' | 'timestamp'>): void {
  auditLog.push({
    ...record,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  })
}

/**
 * Read audit records.
 *
 * @param sessionId - If provided, return only records matching this session.
 *                    If omitted, return all records (for admin views in Phase 2+).
 */
export function readAuditLog(sessionId?: string): AuditRecord[] {
  if (!sessionId) {
    return [...auditLog]
  }
  return auditLog.filter((record) => record.session_id === sessionId)
}

/**
 * Get the total number of audit records (for monitoring/debugging).
 * Not exposed to clients — internal only.
 */
export function getAuditLogSize(): number {
  return auditLog.length
}
