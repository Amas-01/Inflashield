/**
 * SoDEX API client
 *
 * Wraps order placement and portfolio read endpoints.
 * Configured for testnet by default (SODEX_ENV=testnet).
 *
 * Docs: https://sodex.com/documentation/api/api
 */

import { z } from 'zod'
import {
  SODEX_BASE_URL,
  DEFAULT_SLIPPAGE_TOLERANCE,
  ORDER_POLL_TIMEOUT_MS,
  ORDER_POLL_INTERVAL_MS,
} from '@/config/constants'
import type { OrderRequest, OrderResponse, OrderFill } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const OrderResponseSchema = z.object({
  order_id: z.string(),
  status: z.enum(['submitted', 'pending', 'filled', 'rejected', 'cancelled']),
  index_id: z.string(),
  amount_usd: z.number(),
  estimated_fill_price: z.number().nullable(),
  created_at: z.string(),
  tx_hash: z.string().nullable(),
})

const OrderFillSchema = z.object({
  order_id: z.string(),
  status: z.enum(['filled', 'rejected', 'cancelled']),
  filled_at: z.string().nullable(),
  fill_price: z.number().nullable(),
  fill_amount_usd: z.number().nullable(),
  fee_usd: z.number().nullable(),
  rejection_reason: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function sodexFetch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit,
): Promise<T> {
  const apiKey = process.env.SODEX_API_KEY
  if (!apiKey) throw new Error('SODEX_API_KEY is not configured')

  const response = await fetch(`${SODEX_BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`SoDEX API error: ${response.status} ${response.statusText} — ${body}`)
  }

  const json = await response.json()
  return schema.parse(json)
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Submit a single index buy order to SoDEX.
 */
export async function submitOrder(request: OrderRequest): Promise<OrderResponse> {
  const payload = {
    index_id: request.indexId,
    side: request.side,
    amount_usd: request.amountUsd,
    order_type: request.orderType,
    slippage_tolerance: request.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE,
    ...(request.limitPrice !== undefined ? { limit_price: request.limitPrice } : {}),
  }

  const data = await sodexFetch('/v1/orders', OrderResponseSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
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
 * Returns the fill details or the last known status on timeout.
 */
export async function pollOrderStatus(orderId: string): Promise<OrderFill> {
  const deadline = Date.now() + ORDER_POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const data = await sodexFetch(
      `/v1/orders/${orderId}`,
      OrderFillSchema,
    )

    if (['filled', 'rejected', 'cancelled'].includes(data.status)) {
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

  // Timeout — return a partial result so the caller can surface it to the user
  return {
    orderId,
    status: 'pending' as unknown as OrderFill['status'],
    filledAt: null,
    fillPrice: null,
    fillAmountUsd: null,
    feeUsd: null,
    rejectionReason: 'Order timed out — check SoDEX dashboard for status',
  }
}

/**
 * Submit all allocations from a hedge signal as separate market orders.
 * Orders are submitted in parallel; individual failures are collected and returned.
 */
export async function executeHedgeSignal(
  allocations: Array<{ indexId: string; amountUsd: number }>,
): Promise<{ orders: OrderResponse[]; errors: Array<{ indexId: string; error: string }> }> {
  const results = await Promise.allSettled(
    allocations.map((alloc) =>
      submitOrder({
        indexId: alloc.indexId,
        side: 'buy',
        amountUsd: alloc.amountUsd,
        orderType: 'market',
      }),
    ),
  )

  const orders: OrderResponse[] = []
  const errors: Array<{ indexId: string; error: string }> = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      orders.push(result.value)
    } else {
      errors.push({
        indexId: allocations[i].indexId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  })

  return { orders, errors }
}
