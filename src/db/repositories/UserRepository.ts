/**
 * UserRepository — User-scoped data access
 *
 * Handles user lookups by email (for auth) and user ID.
 * No per-user isolation needed (users table is user-agnostic for auth).
 */

import { eq } from 'drizzle-orm'
import { getDb } from '@/db/connection'
import { users, type User } from '@/db/schema/app'

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    // Validate UUID format
    if (!this.isValidUUID(id)) {
      return null
    }

    try {
      const db = await getDb()
      const results = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
      return results[0] ?? null
    } catch (error) {
      console.error('UserRepository.findById error:', error)
      return null
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email || email.length > 255) {
      return null
    }

    try {
      const db = await getDb()
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      return results[0] ?? null
    } catch (error) {
      console.error('UserRepository.findByEmail error:', error)
      return null
    }
  }

  async create(data: {
    email: string
    passwordHash: string
    role?: 'user' | 'admin'
  }): Promise<User | null> {
    if (!data.email || !data.passwordHash) {
      return null
    }

    try {
      const db = await getDb()
      const result = await db
        .insert(users)
        .values({
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role ?? 'user',
        })
        .returning()

      return result?.[0] ?? null
    } catch (error) {
      console.error('UserRepository.create error:', error)
      return null
    }
  }

  async updateLastLogin(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false
    }

    try {
      const db = await getDb()
      await db
        .update(users)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))

      return true
    } catch (error) {
      console.error('UserRepository.updateLastLogin error:', error)
      return false
    }
  }

  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }
}
