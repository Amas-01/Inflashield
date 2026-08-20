/**
 * POST /api/wallet/connect
 *
 * Connects a blockchain wallet to the authenticated user's account.
 * Signature verification happens on the client-side (wagmi handles this).
 * Server just stores the wallet address in the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { WalletRepository } from '@/db/repositories/WalletRepository'
import { writeAudit } from '@/lib/audit/logger'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'

const connectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: z.number().int().positive('Invalid chain ID'),
  label: z.string().max(100, 'Label too long').optional(),
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
    const validated = connectSchema.safeParse(body)

    if (!validated.success) {
      await writeAudit({
        user_id: userId,
        session_id: null,
        resource_id: null,
        ip_address: '0.0.0.0',
        user_agent: 'server',
        action: 'wallet.connect_invalid',
        resource_type: 'wallet',
        outcome: 'failure',
        metadata: {
          error: validated.error.message,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        { error: 'Invalid wallet data', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { address, chainId, label } = validated.data

    // Create wallet record
    const walletRepo = new WalletRepository(userId)
    const wallet = await walletRepo.create({
      address,
      chainId,
      label,
    })

    if (!wallet) {
      throw new Error('Failed to create wallet record')
    }

    // Audit log
    await writeAudit({
      user_id: userId,
      session_id: null,
      resource_id: wallet.id,
      ip_address: '0.0.0.0',
      user_agent: 'server',
      action: 'wallet.connect_success',
      resource_type: 'wallet',
      outcome: 'success',
      metadata: {
        address,
        chainId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json(
      {
        success: true,
        wallet: {
          id: wallet.id,
          address: wallet.address,
          chainId: wallet.chainId,
          label: wallet.label,
          createdAt: wallet.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Wallet connect error:', error)

    await writeAudit({
      user_id: 'system',
      session_id: null,
      resource_id: null,
      ip_address: '0.0.0.0',
      user_agent: 'server',
      action: 'wallet.connect_error',
      resource_type: 'wallet',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Failed to connect wallet' },
      { status: 500 }
    )
  }
}
