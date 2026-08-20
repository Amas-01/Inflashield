/**
 * WalletRepository — User-scoped wallet access
 *
 * Stores user's connected blockchain wallets.
 * Each wallet is associated with a specific user and chain.
 * Data isolation enforced via userId at construction time.
 */

import { eq, and } from 'drizzle-orm'
import { getDb } from '@/db/connection'
import { wallets, type Wallet } from '@/db/schema/app'
import { v4 as uuidv4 } from 'uuid'

export interface WalletCreateInput {
  address: string
  chainId: number
  label?: string
}

export class WalletRepository {
  constructor(private readonly userId: string) {
    // Validate UUID format
    if (!this.isValidUUID(userId)) {
      throw new Error('Invalid userId format')
    }
  }

  async create(data: WalletCreateInput): Promise<Wallet | null> {
    if (!data.address || !data.chainId) {
      return null
    }

    // Normalize address to lowercase
    const normalizedAddress = data.address.toLowerCase()

    try {
      const db = await getDb()

      // Check if wallet already exists for this user + chain
      const existingResults = await db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, this.userId),
            eq(wallets.address, normalizedAddress),
            eq(wallets.chainId, data.chainId)
          )
        )
        .limit(1)

      const existing = existingResults[0]
      
      if (existing) {
        return existing
      }

      // Insert new wallet
      const result = await db
        .insert(wallets)
        .values({
          id: uuidv4(),
          userId: this.userId,
          address: normalizedAddress,
          chainId: data.chainId,
          label: data.label || null,
          createdAt: new Date(),
        })
        .returning()

      return result?.[0] ?? null
    } catch (error) {
      console.error('WalletRepository.create error:', error)
      return null
    }
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    const normalizedAddress = address.toLowerCase()

    try {
      const db = await getDb()
      const results = await db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, this.userId),
            eq(wallets.address, normalizedAddress)
          )
        )
        .limit(1)

      return results[0] ?? null
    } catch (error) {
      console.error('WalletRepository.findByAddress error:', error)
      return null
    }
  }

  async findAll(): Promise<Wallet[]> {
    try {
      const db = await getDb()
      const results = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, this.userId))

      return results ?? []
    } catch (error) {
      console.error('WalletRepository.findAll error:', error)
      return []
    }
  }

  async findByChainId(chainId: number): Promise<Wallet | null> {
    try {
      const db = await getDb()
      const results = await db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, this.userId),
            eq(wallets.chainId, chainId)
          )
        )
        .limit(1)

      return results[0] ?? null
    } catch (error) {
      console.error('WalletRepository.findByChainId error:', error)
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false
    }

    try {
      const db = await getDb()

      // Ensure wallet belongs to this user before deleting
      const walletResults = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, id), eq(wallets.userId, this.userId)))
        .limit(1)

      const wallet = walletResults[0]
      
      if (!wallet) {
        return false
      }

      await db.delete(wallets).where(and(eq(wallets.id, id), eq(wallets.userId, this.userId)))

      return true
    } catch (error) {
      console.error('WalletRepository.delete error:', error)
      return false
    }
  }

  async updateLabel(id: string, label: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false
    }

    try {
      const db = await getDb()

      await db
        .update(wallets)
        .set({ label: label || null })
        .where(and(eq(wallets.id, id), eq(wallets.userId, this.userId)))

      return true
    } catch (error) {
      console.error('WalletRepository.updateLabel error:', error)
      return false
    }
  }

  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }
}
