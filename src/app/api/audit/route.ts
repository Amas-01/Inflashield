/**
 * GET /api/audit
 *
 * Retrieve user's audit log entries (readonly)
 * Optional query parameters: action, outcome, limit (max 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditRepository } from '@/db/repositories/AuditRepository'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || undefined
    const outcome = searchParams.get('outcome') || undefined
    const limitStr = searchParams.get('limit') || '50'

    const limit = Math.min(parseInt(limitStr, 10) || 50, 100)

    // Fetch audit entries
    const auditRepo = AuditRepository.getInstance()
    const entries = await auditRepo.findByUser(userId, limit)

    // Filter if specified
    let filtered = entries || []

    if (action) {
      filtered = filtered.filter((e) => e.action.includes(action))
    }

    if (outcome) {
      if (outcome === 'success' || outcome === 'failure') {
        filtered = filtered.filter((e) => e.outcome === outcome)
      }
    }

    return NextResponse.json(
      {
        success: true,
        entries: filtered.map((e) => ({
          id: e.id,
          userId: e.userId,
          action: e.action,
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          outcome: e.outcome,
          metadata: e.metadata,
          serverTimestamp: e.serverTimestamp,
        })),
        count: filtered.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Audit fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
