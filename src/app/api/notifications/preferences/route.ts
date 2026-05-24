/**
 * GET /api/notifications/preferences
 * PATCH /api/notifications/preferences
 *
 * Retrieve or update user's notification settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { NotificationPreferencesRepository } from '@/db/repositories/NotificationPreferencesRepository'
import { telegramService } from '@/lib/notifications/telegram'
import { writeAudit } from '@/lib/audit/logger'

const updateSchema = z.object({
  telegramChatId: z.string().optional(),
  notifyOnRebalance: z.boolean().optional(),
  notifyThresholdPct: z.number().min(0).max(100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    const repo = new NotificationPreferencesRepository(userId)
    const prefs = await repo.findOrCreate()

    if (!prefs) {
      return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        preferences: {
          telegramChatId: prefs.telegramChatId,
          notifyOnRebalance: prefs.notifyOnRebalance,
          notifyThresholdPct: parseFloat(prefs.notifyThresholdPct || '5'),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    const body = await request.json()
    const validated = updateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { telegramChatId, notifyOnRebalance, notifyThresholdPct } = validated.data

    const repo = new NotificationPreferencesRepository(userId)
    const prefs = await repo.update({
      telegramChatId,
      notifyOnRebalance,
      notifyThresholdPct,
    })

    if (!prefs) {
      throw new Error('Failed to update preferences')
    }

    // If adding Telegram, send a test message
    if (telegramChatId) {
      await telegramService.sendTest(telegramChatId)
    }

    // Audit log
    await writeAudit({
      userId,
      sessionId: null,
      action: 'notifications.preferences_updated',
      resourceType: 'notification_preferences',
      outcome: 'success',
      metadata: {
        hasTelegram: !!telegramChatId,
        notifyOnRebalance,
        threshold: notifyThresholdPct,
      },
    })

    return NextResponse.json(
      {
        success: true,
        preferences: {
          telegramChatId: prefs.telegramChatId,
          notifyOnRebalance: prefs.notifyOnRebalance,
          notifyThresholdPct: parseFloat(prefs.notifyThresholdPct || '5'),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update preferences error:', error)

    await writeAudit({
      userId: 'system',
      sessionId: null,
      action: 'notifications.preferences_error',
      resourceType: 'notification_preferences',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
