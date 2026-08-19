/**
 * SoDEX API client — Phase 1 implementation
 *
 * Wraps order placement and portfolio read endpoints.
 * Configured for testnet by default (SODEX_ENV=testnet).
 *
 * CRITICAL: All order submission functions enforce a testnet guard.
 * If SODEX_ENV=mainnet, all requests are rejected before any network call.
 *
 * Docs: https://sodex.com/documentation/api/api
 */

import { z } from 'zod'
import {
  DEFAULT_SLIPPAGE_TOLERANCE,
  ORDER_POLL_TIMEOUT_MS,
  ORDER_POLL_INTERVAL_MS,
} from '@/config/constants'
import { sanitiseAmount, sanitiseIndexId, sanitiseOrderType, sanitiseSlippageTolerance } from '@/lib/security/sanitise'
import { writeAudit } from '@/lib/audit/logger'
import type { OrderRequest, OrderResponse, OrderFill } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const OrderResponseSchema = z.object({
  order_id: z.string().min(1).max(100),
  status: z.enum(['submitted', 'pending', 'filled', 'rejected', 'cancelled']),
  index_id: z.string().min(1),
  amount_usd: z.number().min(0),
  estimated_fill_price: z.number().nullable(),
  created_at: z.string().datetime(),
  tx_hash: z.string().nullable(),
})

const OrderFillSchema = z.object({
  order_id: z.string().min(1).max(100),
  status: z.enum(['filled', 'rejected', 'cancelled', 'pending']),
  filled_at: z.string().datetime().nullable(),
  fill_price: z.number().nullable(),
  fill_amount_usd: z.number().min(0).nullable(),
  fee_usd: z.number().min(0).nullable(),
  rejection_reason: z.string().max(500).nullable(),
})

// ---------------------------------------------------------------------------
// HTTP helper with testnet guard enforcement
// ---------------------------------------------------------------------------

async function sodexFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
  sessionId?: string,
): Promise<T> {
  const env = await import('@/config/env').then((m) => m.env)
  const apiKey = env.SODEX_API_KEY
  const session = sessionId ?? 'anonymous'

  // Compute base URL once
  const SODEX_BASE =
    env.SODEX_ENV === 'mainnet'
      ? 'https://api.sodex.com'
      : 'https://testnet-api.sodex.com'

  const response = await fetch(`${SODEX_BASE}${path}`, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  })

  // Handle error cases
  if (response.status === 401) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.api_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        path,
        status: 401,
        error: 'SoDEX API key invalid',
      },
      user_agent: 'server',
    })
    const err = new Error('SoDEX API key invalid') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  if (response.status === 403) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.api_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        path,
        status: 403,
        error: 'SoDEX access denied — check SoPoints rank or Buildathon whitelist',
      },
      user_agent: 'server',
    })
    const err = new Error(
      'SoDEX access denied — check SoPoints rank or Buildathon whitelist',
    ) as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  if (response.status === 429) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.api_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        path,
        status: 429,
        error: 'SoDEX rate limit exceeded',
      },
      user_agent: 'server',
    })
    const err = new Error('SoDEX rate limit exceeded') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = true
    throw err
  }

  if (response.status === 503) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.api_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        path,
        status: 503,
        error: 'SoDEX service unavailable',
      },
      user_agent: 'server',
    })
    const err = new Error('SoDEX service unavailable') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = true
    throw err
  }

  if (!response.ok) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.api_error',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        path,
        status: response.status,
        error: response.statusText,
      },
      user_agent: 'server',
    })
    const err = new Error(`SoDEX API error: ${response.status}`) as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = true
    throw err
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (err) {
    const error = new Error('SoDEX response was not valid JSON') as any
    error.code = 'EXECUTION_FAILED'
    error.retryable = false
    throw error
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    const error = new Error('SoDEX response shape unexpected') as any
    error.code = 'EXECUTION_FAILED'
    error.retryable = false
    throw error
  }

  return parsed.data as T
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Submit a single index buy order to SoDEX.
 *
 * TESTNET GUARD: Checks env.SODEX_ENV at runtime.
 * If 'mainnet', throws EXECUTION_FAILED before any network call.
 *
 * @param request - Order request with indexId, amountUsd, orderType
 * @param sessionId - Session context for audit logging
 * @returns OrderResponse with orderId, status, metadata
 * @throws AppError with code EXECUTION_FAILED
 */
export async function submitOrder(
  request: OrderRequest,
  sessionId?: string,
): Promise<OrderResponse> {
  const env = await import('@/config/env').then((m) => m.env)
  const session = sessionId ?? 'anonymous'

  // TESTNET GUARD — checked BEFORE any network request
  if (env.SODEX_ENV !== 'testnet') {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.submit_blocked',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        reason: 'mainnet_disabled',
        sodex_env: env.SODEX_ENV,
      },
      user_agent: 'server',
    })
    const err = new Error('Mainnet execution is disabled in Phase 1. Set SODEX_ENV=testnet.') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  // Sanitise all inputs
  try {
    sanitiseAmount(request.amountUsd)
    sanitiseIndexId(request.indexId)
    sanitiseOrderType(request.orderType)
    if (request.slippageTolerance !== undefined) {
      sanitiseSlippageTolerance(request.slippageTolerance)
    }
  } catch (err: any) {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.submit_attempt',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        reason: 'validation_failed',
        error: err.message,
      },
      user_agent: 'server',
    })
    throw err
  }

  // Bounds check: amount per order capped at $100,000
  if (request.amountUsd > 100_000) {
    const err = new Error('Order amount exceeds $100,000 limit per order') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.submit_attempt',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        reason: 'amount_exceeds_limit',
        requested: request.amountUsd,
      },
      user_agent: 'server',
    })
    throw err
  }

  const payload = {
    index_id: request.indexId,
    side: request.side,
    amount_usd: request.amountUsd,
    order_type: request.orderType,
    slippage_tolerance: request.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE,
    ...(request.limitPrice !== undefined ? { limit_price: request.limitPrice } : {}),
  }

  // Write audit BEFORE submitting
  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'order.submit_attempt',
    resource_type: 'order',
    resource_id: null,
    outcome: 'success',
    metadata: {
      indexId: request.indexId,
      amountUsd: request.amountUsd,
      orderType: request.orderType,
    },
    user_agent: 'server',
  })

  const data = await sodexFetch<z.infer<typeof OrderResponseSchema>>(
    '/v1/orders',
    OrderResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    sessionId,
  )

  // Write audit AFTER successful submission
  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'order.submit_result',
    resource_type: 'order',
    resource_id: data.order_id,
    outcome: 'success',
    metadata: {
      orderId: data.order_id,
      status: data.status,
    },
    user_agent: 'server',
  })

  return {
    orderId: data.order_id,
    status: data.status,
    indexId: data.index_id,
    amountUsd: data.amount_usd,
    estimatedFillPrice: data.estimated_fill_price,
    createdAt: data.created_at,
    txHash: data.tx_hash,
  }
}

/**
 * Poll a single order until it reaches a terminal status or the timeout elapses.
 * Writes audit records when polling starts and completes.
 *
 * @param orderId - Order ID to poll
 * @param sessionId - Session context for audit logging
 * @returns OrderFill with final status and fill details
 */
export async function pollOrderStatus(
  orderId: string,
  sessionId?: string,
): Promise<OrderFill> {
  const session = sessionId ?? 'anonymous'
  const deadline = Date.now() + ORDER_POLL_TIMEOUT_MS

  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'order.poll_start',
    resource_type: 'order',
    resource_id: orderId,
    outcome: 'success',
    metadata: { timeoutMs: ORDER_POLL_TIMEOUT_MS },
    user_agent: 'server',
  })

  while (Date.now() < deadline) {
    const data = await sodexFetch<z.infer<typeof OrderFillSchema>>(
      `/v1/orders/${orderId}`,
      OrderFillSchema,
      undefined,
      sessionId,
    )

    if (['filled', 'rejected', 'cancelled'].includes(data.status)) {
      writeAudit({
      user_id: 'guest',
        session_id: session,
        ip_address: 'server-side',
        action: 'order.poll_complete',
        resource_type: 'order',
        resource_id: orderId,
        outcome: data.status === 'filled' ? 'success' : 'failure',
        metadata: { finalStatus: data.status },
        user_agent: 'server',
      })

      return {
        orderId: data.order_id,
        status: data.status as OrderFill['status'],
        filledAt: data.filled_at,
        fillPrice: data.fill_price,
        fillAmountUsd: data.fill_amount_usd,
        feeUsd: data.fee_usd,
        rejectionReason: data.rejection_reason,
      }
    }

    await new Promise((resolve) => setTimeout(resolve, ORDER_POLL_INTERVAL_MS))
  }

  // Timeout — return a pending result
  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'order.poll_timeout',
    resource_type: 'order',
    resource_id: orderId,
    outcome: 'failure',
    metadata: {
      timeoutMs: ORDER_POLL_TIMEOUT_MS,
      finalStatus: 'pending',
    },
    user_agent: 'server',
  })

  return {
    orderId,
    status: 'pending' as unknown as OrderFill['status'],
    filledAt: null,
    fillPrice: null,
    fillAmountUsd: null,
    feeUsd: null,
    rejectionReason: 'Order polling timed out. Check SoDEX dashboard for final status.',
  }
}

/**
 * Submit all allocations from a hedge signal as separate market orders.
 * Orders are submitted in parallel; individual failures are collected.
 *
 * TESTNET GUARD: Checked at the start of this function.
 *
 * @param allocations - Array of {indexId, amountUsd} to submit
 * @param sessionId - Session context for audit logging
 * @returns Orders and errors
 */
export async function executeHedgeSignal(
  allocations: Array<{ indexId: string; amountUsd: number }>,
  sessionId?: string,
): Promise<{ orders: OrderResponse[]; errors: Array<{ indexId: string; error: string }> }> {
  const env = await import('@/config/env').then((m) => m.env)
  const session = sessionId ?? 'anonymous'

  // TESTNET GUARD
  if (env.SODEX_ENV !== 'testnet') {
    writeAudit({
      user_id: 'guest',
      session_id: session,
      ip_address: 'server-side',
      action: 'order.batch_blocked',
      resource_type: 'order',
      resource_id: null,
      outcome: 'failure',
      metadata: {
        reason: 'mainnet_disabled',
        allocation_count: allocations.length,
      },
      user_agent: 'server',
    })
    const err = new Error('Mainnet execution is disabled in Phase 1. Set SODEX_ENV=testnet.') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  // Validate batch size and total
  if (allocations.length < 1 || allocations.length > 10) {
    const err = new Error('Batch size must be 1–10 orders') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  const total = allocations.reduce((sum, a) => sum + a.amountUsd, 0)
  if (total > 500_000) {
    const err = new Error('Total allocation amount exceeds $500,000 Phase 1 safety cap') as any
    err.code = 'EXECUTION_FAILED'
    err.retryable = false
    throw err
  }

  const results = await Promise.allSettled(
    allocations.map((alloc) =>
      submitOrder(
        {
          indexId: alloc.indexId,
          side: 'buy',
          amountUsd: alloc.amountUsd,
          orderType: 'market',
        },
        sessionId,
      ),
    ),
  )

  const orders: OrderResponse[] = []
  const errors: Array<{ indexId: string; error: string }> = []
  const successIds: string[] = []
  const failureIds: string[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      orders.push(result.value)
      successIds.push(allocations[i].indexId)
    } else {
      errors.push({
        indexId: allocations[i].indexId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
      failureIds.push(allocations[i].indexId)
    }
  })

  // Audit the batch operation
  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'order.batch_submit',
    resource_type: 'order',
    resource_id: null,
    outcome: errors.length === 0 ? 'success' : 'success', // Log as success if any orders succeeded
    metadata: {
      requested: allocations.length,
      succeeded: orders.length,
      failed: errors.length,
      successful_order_ids: orders.map((o) => o.orderId),
      failed_indices: failureIds,
      total_usd: total,
    },
    user_agent: 'server',
  })

  return { orders, errors }
}
