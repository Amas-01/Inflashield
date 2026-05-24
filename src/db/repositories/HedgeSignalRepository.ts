/**
 * HedgeSignalRepository — data access layer for hedge signals
 *
 * This repository enforces data isolation at the construction level.
 * It cannot be instantiated without a userId, and every query mandatorily
 * filters by user_id. This makes it impossible for one user to see another's data.
 */

import { eq, desc, and } from 'drizzle-orm'
import { getDb } from '@/db/connection'
import { hedgeSignals } from '@/db/schema/app'
import type { HedgeSignal as DBHedgeSignal } from '@/db/schema/app'
import type { HedgeSignal } from '@/lib/types'

export class HedgeSignalRepository {
  /**
   * Constructor — userId is mandatory and scoped to this instance.
   * All queries will mandatorily filter by this userId.
   */
  constructor(private readonly userId: string) {
    // Validate userId format: must be a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('Invalid userId format')
    }
  }

  /**
   * Create a new hedge signal
   * @param signal The signal to store
   * @returns The new signal ID
   */
  async create(signal: HedgeSignal): Promise<string> {
    const db = getDb()
    const result = await db
      .insert(hedgeSignals)
      .values({
        userId: this.userId,
        currency: signal.currency,
        amountUsd: signal.amountUsd.toString(),
        riskLevel: signal.riskLevel,
        signalJson: signal as any, // jsonb stores the full signal
      })
      .returning({ id: hedgeSignals.id })

    if (result.length === 0) {
      throw new Error('Failed to create hedge signal')
    }

    return result[0].id
  }

  /**
   * Find a signal by ID with mandatory user_id filter
   * @param id Signal ID (validated for UUID format)
   * @returns The signal or null if not found
   */
  async findById(id: string): Promise<HedgeSignal | null> {
    // Sanitise: validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const db = getDb()
    const result = await db
      .select()
      .from(hedgeSignals)
      .where(
        and(
          eq(hedgeSignals.userId, this.userId),
          eq(hedgeSignals.id, id)
        )
      )
      .limit(1)

    if (result.length === 0) {
      return null
    }

    // Convert DB record to domain type
    return this.dbToDomain(result[0])
  }

  /**
   * Find recent signals for this user
   * @param limit Maximum number of signals to return (clamped to [1, 100])
   * @returns Array of signals ordered by creation (newest first)
   */
  async findRecent(limit: number = 10): Promise<HedgeSignal[]> {
    // Sanitise limit
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))

    const db = getDb()
    const result = await db
      .select()
      .from(hedgeSignals)
      .where(eq(hedgeSignals.userId, this.userId))
      .orderBy(desc(hedgeSignals.createdAt))
      .limit(safeLimit)

    return result.map((r) => this.dbToDomain(r))
  }

  /**
   * Count total hedge signals for this user
   */
  async count(): Promise<number> {
    const db = getDb()
    const result = await db
      .select({ count: hedgeSignals.id })
      .from(hedgeSignals)
      .where(eq(hedgeSignals.userId, this.userId))

    return result.length
  }

  /**
   * Convert database record to domain type
   */
  private dbToDomain(record: DBHedgeSignal): HedgeSignal {
    return {
      id: record.id,
      currency: record.currency,
      amount: parseFloat(record.amountUsd),
      amountUsd: parseFloat(record.amountUsd),
      riskLevel: record.riskLevel as 'conservative' | 'balanced' | 'aggressive',
      allocations: (record.signalJson as any)?.allocations || [],
      rationale: (record.signalJson as any)?.rationale || '',
      createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
    }
  }
}
