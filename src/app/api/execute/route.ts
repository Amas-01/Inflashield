/**
 * POST /api/execute
 *
 * Submits a hedge signal's allocations as market orders to SoDEX testnet.
 * Returns order confirmations for all submitted orders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeHedgeSignal } from '@/lib/api/sodex'
import type { ExecutionResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const ExecuteRequestSchema = z.object({
  signal: z.object({
    allocations: z.array(
      z.object({
        indexId: z.string(),
        amountUsd: z.number().positive(),
      }),
    ),
  }),
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ExecuteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { signal } = parsed.data

  try {
    const { orders, errors } = await executeHedgeSignal(signal.allocations)

    if (orders.length === 0) {
      return NextResponse.json(
        {
          message: 'All orders failed to submit',
          errors,
        },
        { status: 502 },
      )
    }

    const result: Partial<ExecutionResult> = { orders }
    return NextResponse.json(result)
  } catch (err) {
    console.error('/api/execute error:', err)
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 },
    )
  }
}
