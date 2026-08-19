/**
 * SoSoValue API client — Phase 1 implementation
 *
 * Wraps all SoSoValue SSI endpoints used by InflaShield.
 * All responses are validated with Zod before being returned.
 * Includes retry logic for transient failures (429, 503).
 * Every request is logged to the audit trail.
 *
 * Docs: https://sosovalue-1.gitbook.io/sosovalue-api-doc
 * TODO: Verify base URL is correct in current API docs
 */

import { z } from 'zod'
import { SOSOVALUE_BASE_URL, INDEX_FETCH_LIMIT, PERFORMANCE_WINDOW } from '@/config/constants'
import { writeAudit } from '@/lib/audit/logger'
import type { SSIIndex, IndexPerformance } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas (Zod)
// Validate API responses at runtime so TypeScript types are trustworthy.
// ---------------------------------------------------------------------------

const IndexComponentSchema = z.object({
  symbol: z.string().min(1).max(10),
  weight: z.number().min(0).max(1),
})

const RiskMetricsSchema = z.object({
  volatility_30d: z.number().min(0),
  max_drawdown_90d: z.number().max(0), // drawdown is negative
  sharpe_30d: z.number().nullable().optional(),
})

const IndexSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  symbol: z.string().min(1).max(20),
  tvl: z.number().min(0),
  components: z.array(IndexComponentSchema).max(50),
  return_30d: z.number(),
  return_7d: z.number(),
  risk_metrics: RiskMetricsSchema.optional(),
})

const IndexListResponseSchema = z.object({
  data: z.array(IndexSchema).max(100),
  total: z.number().int().min(0),
})

const PerformancePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  return: z.number(),
  nav: z.number().min(0),
})

const PerformanceResponseSchema = z.object({
  id: z.string().min(1),
  window: z.string(),
  data_points: z.array(PerformancePointSchema).max(365), // max 1 year of data
})

// ---------------------------------------------------------------------------
// Base fetcher with retry logic
// ---------------------------------------------------------------------------

async function sosoFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: Record<string, string>,
  sessionId?: string,
): Promise<T> {
  const env = await import('@/config/env').then((m) => m.env)
  const apiKey = env.SOSOVALUE_API_KEY
  const session = sessionId ?? 'anonymous'

  let lastError: Error | null = null
  let lastStatus: number = 0

  // Retry logic: up to 2 retries on 429/503
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = new URL(`${SOSOVALUE_BASE_URL}${path}`)
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      } as RequestInit)

      clearTimeout(timeoutId)
      lastStatus = response.status

      // Don't retry on auth errors
      if (response.status === 401) {
        writeAudit({
      user_id: 'guest',
          session_id: session,
          ip_address: 'server-side',
          action: 'sosovalue.fetch',
          resource_type: null,
          resource_id: null,
          outcome: 'failure',
          metadata: {
            path,
            params,
            status: 401,
            attempt,
            error: 'SoSoValue API key invalid or missing',
          },
          user_agent: 'server',
        })
        const err = new Error('SoSoValue API key invalid or missing') as any
        err.code = 'INDEX_FETCH_FAILED'
        err.retryable = false
        throw err
      }

      if (response.status === 404) {
        writeAudit({
      user_id: 'guest',
          session_id: session,
          ip_address: 'server-side',
          action: 'sosovalue.fetch',
          resource_type: null,
          resource_id: null,
          outcome: 'failure',
          metadata: {
            path,
            params,
            status: 404,
            attempt,
            error: `SoSoValue resource not found: ${path}`,
          },
          user_agent: 'server',
        })
        const err = new Error(`SoSoValue resource not found: ${path}`) as any
        err.code = 'INDEX_FETCH_FAILED'
        err.retryable = false
        throw err
      }

      // Retry on rate limit / service unavailable
      if (response.status === 429 || response.status === 503) {
        if (attempt < 2) {
          const backoffMs = 1000 * Math.pow(2, attempt)
          console.warn(
            `[SoSoValue] Got ${response.status}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/3)`,
          )
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
          continue
        }
      }

      if (!response.ok) {
        writeAudit({
      user_id: 'guest',
          session_id: session,
          ip_address: 'server-side',
          action: 'sosovalue.fetch',
          resource_type: null,
          resource_id: null,
          outcome: 'failure',
          metadata: {
            path,
            params,
            status: response.status,
            attempt,
            error: response.statusText,
          },
          user_agent: 'server',
        })
        const err = new Error(`SoSoValue API error: ${response.status}`) as any
        err.code = 'INDEX_FETCH_FAILED'
        err.retryable = true
        throw err
      }

      // Parse and validate response
      let json: unknown
      try {
        json = await response.json()
      } catch (parseErr) {
        writeAudit({
      user_id: 'guest',
          session_id: session,
          ip_address: 'server-side',
          action: 'sosovalue.fetch',
          resource_type: null,
          resource_id: null,
          outcome: 'failure',
          metadata: {
            path,
            params,
            status: response.status,
            attempt,
            error: 'Response was not valid JSON',
          },
          user_agent: 'server',
        })
        const error = new Error('SoSoValue response was not valid JSON') as any
        error.code = 'INDEX_FETCH_FAILED'
        error.retryable = false
        throw error
      }

      const parsed = schema.safeParse(json)
      if (!parsed.success) {
        writeAudit({
      user_id: 'guest',
          session_id: session,
          ip_address: 'server-side',
          action: 'sosovalue.fetch',
          resource_type: null,
          resource_id: null,
          outcome: 'failure',
          metadata: {
            path,
            params,
            status: response.status,
            attempt,
            error: 'SoSoValue response shape unexpected — check API version',
          },
          user_agent: 'server',
        })
        const error = new Error('SoSoValue response shape unexpected — check API version') as any
        error.code = 'INDEX_FETCH_FAILED'
        error.retryable = false
        throw error
      }

      // Success — write audit and return
      writeAudit({
      user_id: 'guest',
        session_id: session,
        ip_address: 'server-side',
        action: 'sosovalue.fetch',
        resource_type: null,
        resource_id: null,
        outcome: 'success',
        metadata: {
          path,
          params,
          status: response.status,
          attempt,
        },
        user_agent: 'server',
      })

      return parsed.data as T
    } catch (err: any) {
      lastError = err
      if (!err.retryable || attempt >= 2) {
        throw err
      }
    }
  }

  // All retries exhausted
  const err = new Error('All retries exhausted for SoSoValue request') as any
  err.code = 'INDEX_FETCH_FAILED'
  err.retryable = true
  throw err
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of available SSI indices.
 * Returns the top N indices ordered by TVL descending.
 *
 * @param sessionId - Session context for audit logging
 * @returns Array of SSIIndex objects
 */
export async function fetchIndexList(sessionId?: string): Promise<SSIIndex[]> {
  const data = await sosoFetch<z.infer<typeof IndexListResponseSchema>>(
    '/v1/indexes',
    IndexListResponseSchema,
    { limit: String(INDEX_FETCH_LIMIT), sort: 'tvl_desc' },
    sessionId,
  )

  return data.data.map((raw: z.infer<typeof IndexSchema>) => {
    // Warn if risk metrics are missing
    if (!raw.risk_metrics) {
      console.warn(`[SoSoValue] Index ${raw.id} missing risk_metrics`)
    }

    return {
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
    }
  })
}

/**
 * Fetch daily performance data for a single index.
 *
 * @param indexId - Index ID to fetch performance for
 * @param window - Time window ('7d', '30d', '90d')
 * @param sessionId - Session context for audit logging
 * @returns IndexPerformance with sorted data points
 */
export async function fetchIndexPerformance(
  indexId: string,
  window: '7d' | '30d' | '90d' = '30d',
  sessionId?: string,
): Promise<IndexPerformance> {
  // Sanitise indexId: alphanumeric, hyphen, underscore only
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(indexId)) {
    const err = new Error(`Invalid index ID format: ${indexId}`) as any
    err.code = 'INDEX_FETCH_FAILED'
    err.retryable = false
    throw err
  }

  const data = await sosoFetch<z.infer<typeof PerformanceResponseSchema>>(
    `/v1/indexes/${indexId}/performance`,
    PerformanceResponseSchema,
    { window },
    sessionId,
  )

  // Sort data points by date ascending
  const sorted = [...data.data_points].sort((a: z.infer<typeof PerformancePointSchema>, b: z.infer<typeof PerformancePointSchema>) => a.date.localeCompare(b.date))

  return {
    indexId: data.id,
    window,
    dataPoints: sorted.map((p: z.infer<typeof PerformancePointSchema>) => ({
      date: p.date,
      returnPct: p.return,
      nav: p.nav,
    })),
  }
}

/**
 * Fetch performance data for multiple indices in parallel.
 * Gracefully handles individual failures — failures don't abort the batch.
 * Returns a Map of successful results only.
 *
 * @param indexIds - Array of index IDs (max 50)
 * @param window - Time window ('7d', '30d', '90d')
 * @param sessionId - Session context for audit logging
 * @returns Map of successful IndexPerformance objects
 */
export async function fetchIndexPerformanceBatch(
  indexIds: string[],
  window: '7d' | '30d' | '90d' = '30d',
  sessionId?: string,
): Promise<Map<string, IndexPerformance>> {
  const session = sessionId ?? 'anonymous'

  // Validate batch size
  if (indexIds.length > 50) {
    console.warn(`[SoSoValue] Batch size ${indexIds.length} exceeds 50, truncating to 50`)
    indexIds = indexIds.slice(0, 50)
  }

  const results = await Promise.allSettled(
    indexIds.map((id) => fetchIndexPerformance(id, window, sessionId)),
  )

  const map = new Map<string, IndexPerformance>()
  const succeeded: string[] = []
  const failed: string[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      map.set(indexIds[i], result.value)
      succeeded.push(indexIds[i])
    } else {
      console.warn(`Failed to fetch performance for ${indexIds[i]}:`, result.reason)
      failed.push(indexIds[i])
    }
  })

  // Audit the batch operation
  writeAudit({
      user_id: 'guest',
    session_id: session,
    ip_address: 'server-side',
    action: 'sosovalue.fetch_batch',
    resource_type: null,
    resource_id: null,
    outcome: failed.length === 0 ? 'success' : 'success', // Log as success if any succeeded
    metadata: {
      window,
      requested: indexIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
      succeeded_ids: succeeded,
      failed_ids: failed,
    },
    user_agent: 'server',
  })

  return map
}
