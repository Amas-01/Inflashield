/**
 * SoSoValue API client
 *
 * Wraps all SoSoValue SSI endpoints used by InflaShield.
 * All responses are validated with Zod before being returned.
 *
 * Docs: https://sosovalue-1.gitbook.io/sosovalue-api-doc
 */

import { z } from 'zod'
import { SOSOVALUE_BASE_URL, INDEX_FETCH_LIMIT } from '@/config/constants'
import type { SSIIndex, IndexPerformance } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas (Zod)
// Validate API responses at runtime so TypeScript types are trustworthy.
// ---------------------------------------------------------------------------

const IndexComponentSchema = z.object({
  symbol: z.string(),
  weight: z.number(),
})

const RiskMetricsSchema = z.object({
  volatility_30d: z.number(),
  max_drawdown_90d: z.number(),
  sharpe_30d: z.number().nullable().optional(),
})

const IndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  tvl: z.number(),
  components: z.array(IndexComponentSchema),
  return_30d: z.number(),
  return_7d: z.number(),
  risk_metrics: RiskMetricsSchema.optional(),
})

const IndexListResponseSchema = z.object({
  data: z.array(IndexSchema),
  total: z.number(),
})

const PerformancePointSchema = z.object({
  date: z.string(),
  return: z.number(),
  nav: z.number(),
})

const PerformanceResponseSchema = z.object({
  id: z.string(),
  window: z.string(),
  data_points: z.array(PerformancePointSchema),
})

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function sosoFetch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  params?: Record<string, string>,
): Promise<T> {
  const apiKey = process.env.SOSOVALUE_API_KEY
  if (!apiKey) throw new Error('SOSOVALUE_API_KEY is not configured')

  const url = new URL(`${SOSOVALUE_BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    // Next.js fetch cache: revalidate every 5 minutes
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`SoSoValue API error: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return schema.parse(json)
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of available SSI indices.
 * Returns the top N indices ordered by TVL descending.
 */
export async function fetchIndexList(): Promise<SSIIndex[]> {
  const data = await sosoFetch(
    '/v1/indexes',
    IndexListResponseSchema,
    { limit: String(INDEX_FETCH_LIMIT), sort: 'tvl_desc' },
  )

  return data.data.map((raw) => ({
    id: raw.id,
    name: raw.name,
    symbol: raw.symbol,
    tvlUsd: raw.tvl,
    components: raw.components,
    return30d: raw.return_30d,
    return7d: raw.return_7d,
    riskMetrics: {
      volatility30d: raw.risk_metrics?.volatility_30d ?? 0,
      maxDrawdown90d: raw.risk_metrics?.max_drawdown_90d ?? 0,
      sharpe30d: raw.risk_metrics?.sharpe_30d ?? null,
    },
  }))
}

/**
 * Fetch daily performance data for a single index.
 */
export async function fetchIndexPerformance(
  indexId: string,
  window: '7d' | '30d' | '90d' = '30d',
): Promise<IndexPerformance> {
  const data = await sosoFetch(
    `/v1/indexes/${indexId}/performance`,
    PerformanceResponseSchema,
    { window },
  )

  return {
    indexId: data.id,
    window,
    dataPoints: data.data_points.map((p) => ({
      date: p.date,
      returnPct: p.return,
      nav: p.nav,
    })),
  }
}

/**
 * Fetch performance for multiple indices in parallel.
 * Gracefully handles individual failures — a single index failing
 * does not abort the whole batch.
 */
export async function fetchIndexPerformanceBatch(
  indexIds: string[],
  window: '7d' | '30d' | '90d' = '30d',
): Promise<Map<string, IndexPerformance>> {
  const results = await Promise.allSettled(
    indexIds.map((id) => fetchIndexPerformance(id, window)),
  )

  const map = new Map<string, IndexPerformance>()
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      map.set(indexIds[i], result.value)
    } else {
      console.warn(`Failed to fetch performance for ${indexIds[i]}:`, result.reason)
    }
  })
  return map
}
