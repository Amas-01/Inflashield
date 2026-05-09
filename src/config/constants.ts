/**
 * App-wide constants
 *
 * Centralised so changing a value (e.g. increasing the index fetch limit)
 * requires a change in exactly one place.
 */

import type { RiskLevel } from '@/lib/types'

// ---------------------------------------------------------------------------
// API base URLs
// ---------------------------------------------------------------------------

export const SOSOVALUE_BASE_URL = 'https://api.sosovalue.com'

export const SODEX_BASE_URL =
  process.env.SODEX_ENV === 'mainnet'
    ? 'https://api.sodex.com'
    : 'https://testnet-api.sodex.com'

export const EXCHANGERATE_BASE_URL = 'https://v6.exchangerate-api.com/v6'

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

/** Number of SSI indices fetched and scored per request */
export const INDEX_FETCH_LIMIT = Number(process.env.INDEX_FETCH_LIMIT ?? 10)

/** Performance window used for inflation correlation calculation */
export const PERFORMANCE_WINDOW = '30d' as const

/** Scoring weights — must sum to 1.0 */
export const SCORING_WEIGHTS = {
  inflationCorrelation: 0.45,
  riskAdjustedReturn: 0.35,
  liquidity: 0.20,
} as const

/** Allocation rules per risk level */
export const RISK_PROFILES: Record<
  RiskLevel,
  { maxIndexCount: number; maxSingleWeight: number }
> = {
  conservative: { maxIndexCount: 3, maxSingleWeight: 0.40 },
  balanced:     { maxIndexCount: 2, maxSingleWeight: 0.60 },
  aggressive:   { maxIndexCount: 1, maxSingleWeight: 1.00 },
}

// ---------------------------------------------------------------------------
// Execution configuration
// ---------------------------------------------------------------------------

export const DEFAULT_SLIPPAGE_TOLERANCE = 0.005 // 0.5%

/** How long to poll SoDEX for order fill before giving up (ms) */
export const ORDER_POLL_TIMEOUT_MS = 30_000

/** Interval between order status polls (ms) */
export const ORDER_POLL_INTERVAL_MS = 2_000

// ---------------------------------------------------------------------------
// Cache / rate limit
// ---------------------------------------------------------------------------

/** How long to cache exchange rates in memory (ms) */
export const RATE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// UI defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? 'USD'

/** Currencies shown at the top of the currency selector (most common inflation use cases) */
export const PRIORITY_CURRENCIES = [
  'USD', 'EUR', 'GBP',
  'NGN', 'TRY', 'ARS', 'BRL',
  'EGP', 'PKR', 'INR', 'GHS',
  'KES', 'ZAR', 'VES',
] as const

export const RISK_LABELS: Record<RiskLevel, string> = {
  conservative: 'Conservative — spread across 3 indices, lower single-asset exposure',
  balanced:     'Balanced — 2 indices, moderate concentration',
  aggressive:   'Aggressive — highest-scoring index, maximum potential return',
}
