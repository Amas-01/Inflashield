/**
 * AuditRepository — append-only audit log access
 *
 * This repository uses the auditDb connection (restricted role with INSERT-only).
 * It is implemented as a singleton — audit is a cross-user resource that only
 * admins can read, so there is no per-user instance.
 *
 * Audit writes never throw — they are silent on failure to prevent breaking
 * the main application flow.
 */

import { eq, desc, gte, lte, and } from 'drizzle-orm'
import { getAuditDb } from '@/db/connection'
import { auditLog } from '@/db/schema/audit'
import type { AuditRecordInsert, AuditRecord } from '@/db/schema/audit'

export class AuditRepository {
  private static instance: AuditRepository

  private constructor() {}

  static getInstance(): AuditRepository {
    if (!AuditRepository.instance) {
      AuditRepository.instance = new AuditRepository()
    }
    return AuditRepository.instance
  }

  /**
   * Write an audit record (append-only)
   * This function NEVER throws — failures are logged but not re-thrown.
   * An audit write failure must never break the main application flow.
   *
   * @param record The audit record to insert
   */
  async write(record: Omit<AuditRecordInsert, 'serverTimestamp'>): Promise<void> {
    try {
      const db = getAuditDb()
      await db.insert(auditLog).values({
        ...record,
      })
    } catch (error) {
      // Log the error but do not throw
      console.error('[AuditRepository] Failed to write audit record:', {
        action: record.action,
        outcome: record.outcome,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      })
      // Intentionally do not re-throw
    }
  }

  /**
   * Find audit records for a specific user
   * Used by users reading their own audit trail.
   *
   * @param userId The user ID to filter by (validated for UUID format)
   * @param limit Maximum records to return (clamped to [1, 1000])
   * @returns Array of audit records ordered by timestamp (newest first)
   */
  async findByUser(userId: string, limit: number = 50): Promise<AuditRecord[]> {
    // Sanitise userId: must be a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      console.warn('[AuditRepository] Invalid userId format:', userId)
      return []
    }

    // Sanitise limit: clamp to [1, 1000]
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)))

    try {
      const db = getAuditDb()
      const result = await db
        .select()
        .from(auditLog)
        .where(eq(auditLog.userId, userId))
        .orderBy(desc(auditLog.serverTimestamp))
        .limit(safeLimit)

      return result
    } catch (error) {
      console.error('[AuditRepository] Failed to query user audit records:', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * Find audit records with optional filters (admin only)
   * The caller must have already verified admin role — this method does not check.
   *
   * @param filters Optional filters: from date, to date, action, outcome
   * @param limit Maximum records to return (clamped to [1, 5000])
   * @returns Array of audit records ordered by timestamp (newest first)
   */
  async findAll(
    filters?: {
      from?: Date
      to?: Date
      action?: string
      outcome?: 'success' | 'failure'
    },
    limit: number = 200
  ): Promise<AuditRecord[]> {
    // Sanitise limit: clamp to [1, 5000] for admins
    const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)))

    const conditions: any[] = []

    // Sanitise and add optional filters
    if (filters?.from) {
      conditions.push(gte(auditLog.serverTimestamp, filters.from))
    }

    if (filters?.to) {
      conditions.push(lte(auditLog.serverTimestamp, filters.to))
    }

    if (filters?.action) {
      // Sanitise action: must match /^[a-z_.]{1,100}$/
      const sanitisedAction = String(filters.action).substring(0, 100)
      if (/^[a-z_.]{1,100}$/.test(sanitisedAction)) {
        conditions.push(eq(auditLog.action, sanitisedAction))
      }
    }

    if (filters?.outcome) {
      // Sanitise outcome: must be exactly 'success' or 'failure'
      if (filters.outcome === 'success' || filters.outcome === 'failure') {
        conditions.push(eq(auditLog.outcome, filters.outcome))
      }
    }

    try {
      const db = getAuditDb()
      const result = await (conditions.length > 0
        ? db
            .select()
            .from(auditLog)
            .where(and(...conditions))
            .orderBy(desc(auditLog.serverTimestamp))
            .limit(safeLimit)
        : db
            .select()
            .from(auditLog)
            .orderBy(desc(auditLog.serverTimestamp))
            .limit(safeLimit))

      return result
    } catch (error) {
      console.error('[AuditRepository] Failed to query audit records:', {
        filters,
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }
}

/**
 * Convenience export — singleton instance
 */
export function getAuditRepository() {
  return AuditRepository.getInstance()
}
