/**
 * POST /api/wallet/disconnect
 *
 * Disconnects a wallet from the authenticated user's account.
 * Requires wallet ID that belongs to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { WalletRepository } from '@/db/repositories/WalletRepository'
import { writeAudit } from '@/lib/audit/logger'

const disconnectSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID'),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Parse and validate request body
    const body = await request.json()
    const validated = disconnectSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid wallet ID', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { walletId } = validated.data

    // Delete wallet (userId check happens in repository)
    const walletRepo = new WalletRepository(userId)
    const success = await walletRepo.delete(walletId)

    if (!success) {
      await writeAudit({
        userId,
        sessionId: null,
        action: 'wallet.disconnect_not_found',
        resourceType: 'wallet',
        resourceId: walletId,
        outcome: 'failure',
        metadata: {
          reason: 'Wallet does not belong to user',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        { error: 'Wallet not found or does not belong to you' },
        { status: 404 }
      )
    }

    // Audit log
    await writeAudit({
      userId,
      sessionId: null,
      action: 'wallet.disconnect_success',
      resourceType: 'wallet',
      resourceId: walletId,
      outcome: 'success',
      metadata: {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json(
      { success: true, message: 'Wallet disconnected' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Wallet disconnect error:', error)

    await writeAudit({
      userId: 'system',
      sessionId: null,
      action: 'wallet.disconnect_error',
      resourceType: 'wallet',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Failed to disconnect wallet' },
      { status: 500 }
    )
  }
}
