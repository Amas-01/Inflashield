/**
 * POST /api/execute
 *
 * Submits a hedge signal's allocations as market orders to SoDEX testnet.
 *
 * 1. Extract session and validate permissions
 * 2. Validate testnet guard (no mainnet execution in Phase 1)
 * 3. Sanitise all allocations
 * 4. Submit orders in parallel
 * 5. Log success/failure for each order
 *
 * Response includes only: orderId, status, indexId per order.
 * Raw SoDEX responses are not returned to the client.
 *
 * Every action is logged to the audit trail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/config/env'
import { extractSession } from '@/lib/session/extractSession'
import { can } from '@/config/permissions'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'
import { sanitiseAmount, sanitiseIndexId } from '@/lib/security/sanitise'
import { writeAudit } from '@/lib/audit/logger'
import { executeHedgeSignal } from '@/lib/api/sodex'

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Extract session
  const session = extractSession(request)

  // 2. Check permissions
  if (!can('guest', 'execute', 'order')) {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_blocked',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'permission_denied' },
      user_agent: session.userAgent,
    })
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // 3. Testnet guard — BEFORE any network calls
  if (env.SODEX_ENV !== 'testnet') {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_blocked',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        reason: 'mainnet_blocked',
        sodex_env: env.SODEX_ENV,
      },
      user_agent: session.userAgent,
    })
    return NextResponse.json(
      { message: 'Mainnet execution is disabled in Phase 1. Contact team to enable testnet.' },
      { status: 403 },
    )
  }

  // 4. Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_attempt',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'invalid_json' },
      user_agent: session.userAgent,
    })
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  // 5. Validate structure
  if (
    !body ||
    typeof body !== 'object' ||
    !('signal' in body) ||
    !Array.isArray((body as any).signal?.allocations)
  ) {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_attempt',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'invalid_structure' },
      user_agent: session.userAgent,
    })
    return NextResponse.json(
      { message: 'Invalid request: expecting signal.allocations array' },
      { status: 400 },
    )
  }

  const allocations = (body as any).signal.allocations

  // 6. Sanitise all allocations
  const sanitisedAllocations: Array<{ indexId: string; amountUsd: number }> = []
  try {
    for (const alloc of allocations) {
      if (typeof alloc !== 'object' || alloc === null) {
        throw new Error('Every allocation must be an object')
      }

      const indexId = sanitiseIndexId(alloc.indexId)
      const amountUsd = sanitiseAmount(alloc.amountUsd)

      sanitisedAllocations.push({ indexId, amountUsd })
    }
  } catch (err: any) {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_attempt',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'validation_failed', error: err.message },
      user_agent: session.userAgent,
    })
    return NextResponse.json(
      { message: 'Invalid allocation data', error: err.message },
      { status: 400 },
    )
  }

  try {
    // 7. Submit orders (testnet guard is inside executeHedgeSignal)
    const { orders, errors } = await executeHedgeSignal(sanitisedAllocations, session.sessionId)

    // 8. Log the result
    if (orders.length === 0) {
      writeAudit({
        session_id: session.sessionId,
        ip_address: session.ip,
        action: 'order.execute_result',
        resource_type: 'order',
        resource_id: null,
        outcome: 'failure',
        metadata: {
          reason: 'all_orders_failed',
          requested: sanitisedAllocations.length,
          failed: errors.length,
        },
        user_agent: session.userAgent,
      })
      return NextResponse.json(
        {
          message: 'All orders failed to submit',
          errors: errors.map((e) => ({ indexId: e.indexId, error: e.error })),
        },
        { status: 502 },
      )
    }

    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_result',
      resource_type: 'order',
      resource_id: null,
      outcome: 'success',
      metadata: {
        requested: sanitisedAllocations.length,
        succeeded: orders.length,
        failed: errors.length,
        order_ids: orders.map((o) => o.orderId),
      },
      user_agent: session.userAgent,
    })

    // 9. Return only necessary fields (don't expose raw SoDEX response)
    return NextResponse.json(
      {
        orders: orders.map((o) => ({
          orderId: o.orderId,
          status: o.status,
          indexId: o.indexId,
          amountUsd: o.amountUsd,
        })),
        errors: errors.map((e) => ({ indexId: e.indexId, error: e.error })),
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('[/api/execute] error:', err.message)

    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'order.execute_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: { error: err.message ?? 'unknown' },
      user_agent: session.userAgent,
    })

    // Don't expose internal error details
    return NextResponse.json(
      { message: 'Failed to execute orders. Please try again.' },
      { status: 500 },
    )
  }
}
