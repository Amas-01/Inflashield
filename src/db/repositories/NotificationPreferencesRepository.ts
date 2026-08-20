/**
 * NotificationPreferencesRepository — User notification settings
 *
 * Stores and retrieves user's notification preferences.
 * Tied to a specific user for data isolation.
 */

import { eq } from 'drizzle-orm'
import { getDb } from '@/db/connection'
import { notificationPreferences, type NotificationPreferences } from '@/db/schema/app'

export class NotificationPreferencesRepository {
  constructor(private readonly userId: string) {}

  async findOrCreate(): Promise<NotificationPreferences | null> {
    try {
      const db = await getDb()

      const results = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, this.userId))
        .limit(1)

      let result = results[0] || null

      // Create default preferences if not found
      if (!result) {
        const created = await db
          .insert(notificationPreferences)
          .values({
            userId: this.userId,
            telegramChatId: null,
            notifyOnRebalance: true,
            notifyThresholdPct: '5',
          })
          .returning()

        result = created?.[0] ?? null
      }

      return result
    } catch (error) {
      console.error('NotificationPreferences Repository.findOrCreate error:', error)
      return null
    }
  }

  async update(data: {
    telegramChatId?: string | null
    notifyOnRebalance?: boolean
    notifyThresholdPct?: number
  }): Promise<NotificationPreferences | null> {
    try {
      const db = await getDb()

      const updateData: any = {}
      if (data.telegramChatId !== undefined) updateData.telegramChatId = data.telegramChatId
      if (data.notifyOnRebalance !== undefined) updateData.notifyOnRebalance = data.notifyOnRebalance
      if (data.notifyThresholdPct !== undefined)
        updateData.notifyThresholdPct = data.notifyThresholdPct.toString()
      updateData.updatedAt = new Date()

      const result = await db
        .update(notificationPreferences)
        .set(updateData)
        .where(eq(notificationPreferences.userId, this.userId))
        .returning()

      return result?.[0] ?? null
    } catch (error) {
      console.error('NotificationPreferencesRepository.update error:', error)
      return null
    }
  }
}
