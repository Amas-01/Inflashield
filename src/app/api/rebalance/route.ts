/**
 * POST /api/rebalance
 *
 * Manual trigger for portfolio rebalancing.
 * In production, this would be triggered by a background scheduler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rebalanceAgent } from '@/lib/engine/rebalanceAgent'
import { writeAudit } from '@/lib/audit/logger'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Trigger rebalance for this user
    const results = await rebalanceAgent.rebalanceUser(userId)

    await writeAudit({
      user_id: userId,
      session_id: null,
      resource_id: null,
      ip_address: '0.0.0.0',
      user_agent: 'server',
      action: 'rebalance.triggered_manual',
      resource_type: 'portfolio',
      outcome: 'success',
      metadata: {
        rebalancedCount: results.filter((r) => r.executed).length,
        currenciesRebalanced: results.map((r) => r.currency),
      },
    })

    return NextResponse.json(
      {
        success: true,
        rebalances: results.map((r) => ({
          currency: r.currency,
          drift: r.drift.toFixed(2),
          executed: r.executed,
          error: r.error,
        })),
        count: results.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Rebalance error:', error)

    await writeAudit({
      user_id: 'system',
      session_id: null,
      resource_id: null,
      ip_address: '0.0.0.0',
      user_agent: 'server',
      action: 'rebalance.error',
      resource_type: 'portfolio',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json({ error: 'Rebalance failed' }, { status: 500 })
  }
}
