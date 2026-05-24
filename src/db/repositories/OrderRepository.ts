/**
 * OrderRepository — data access layer for orders
 *
 * Enforces data isolation: all queries filter by userId from the constructor.
 */

import { eq, desc, and } from 'drizzle-orm'
import { getDb } from '@/db/connection'
import { orders } from '@/db/schema/app'
import type { Order, OrderInsert } from '@/db/schema/app'

export class OrderRepository {
  constructor(private readonly userId: string) {
    // Validate userId format: must be a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('Invalid userId format')
    }
  }

  /**
   * Create a new order
   */
  async create(order: Omit<OrderInsert, 'userId'>): Promise<string> {
    const db = getDb()
    const result = await db
      .insert(orders)
      .values({
        ...order,
        userId: this.userId,
      })
      .returning({ id: orders.id })

    if (result.length === 0) {
      throw new Error('Failed to create order')
    }

    return result[0].id
  }

  /**
   * Find an order by ID with mandatory user_id filter
   */
  async findById(id: string): Promise<Order | null> {
    // Sanitise: validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const db = getDb()
    const result = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, this.userId),
          eq(orders.id, id)
        )
      )
      .limit(1)

    return result.length > 0 ? result[0] : null
  }

  /**
   * Find recent orders for this user
   */
  async findRecent(limit: number = 10): Promise<Order[]> {
    // Sanitise limit
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))

    const db = getDb()
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, this.userId))
      .orderBy(desc(orders.createdAt))
      .limit(safeLimit)

    return result
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: string): Promise<boolean> {
    // Sanitise: validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return false
    }

    const db = getDb()
    const result = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.userId, this.userId),
          eq(orders.id, id)
        )
      )
      .returning({ id: orders.id })

    return result.length > 0
  }

  /**
   * Count total orders for this user
   */
  async count(): Promise<number> {
    const db = getDb()
    const result = await db
      .select({ count: orders.id })
      .from(orders)
      .where(eq(orders.userId, this.userId))

    return result.length
  }
}
