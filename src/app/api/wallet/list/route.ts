/**
 * GET /api/wallet/list
 *
 * Returns all wallets connected to the authenticated user's account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { WalletRepository } from '@/db/repositories/WalletRepository'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Fetch user's wallets
    const walletRepo = new WalletRepository(userId)
    const wallets = await walletRepo.findAll()

    return NextResponse.json(
      {
        success: true,
        wallets: wallets.map((w) => ({
          id: w.id,
          address: w.address,
          chainId: w.chainId,
          label: w.label,
          createdAt: w.createdAt,
        })),
        count: wallets.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Wallet list error:', error)

    return NextResponse.json(
      { error: 'Failed to list wallets' },
      { status: 500 }
    )
  }
}
