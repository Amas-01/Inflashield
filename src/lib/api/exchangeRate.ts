/**
 * ExchangeRate-API client — Phase 1 implementation
 *
 * Fetches live FX rates for 170+ currencies.
 * Includes an in-memory cache (1 hour TTL) to respect the free tier limit.
 * Cache entries persist while the cache size stays under 500 entries.
 * When exceeded, oldest 50 entries are evicted.
 *
 * Free tier: 1,500 requests/month — no credit card required
 * Register: https://www.exchangerate-api.com
 * Docs:     https://www.exchangerate-api.com/docs/overview
 *
 * If ExchangeRate-API is unavailable, the fallback uses frankfurter.app
 * (European Central Bank data, EUR-based pairs).
 *
 * Every rate fetch is logged to the audit trail with source (primary/fallback)
 * and session context for accountability.
 */

import { z } from 'zod'
import { EXCHANGERATE_BASE_URL, RATE_CACHE_TTL_MS } from '@/config/constants'
import { sanitiseCurrency, sanitiseAmount } from '@/lib/security/sanitise'
import { writeAudit } from '@/lib/audit/logger'
import type { SpotRate, AppError } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const PairRateSchema = z.object({
  result: z.literal('success'),
  base_code: z.string(),
  target_code: z.string(),
  conversion_rate: z.number().positive(),
})

const FrankfurterRateSchema = z.object({
  rates: z.record(z.string(), z.number()),
})

// ---------------------------------------------------------------------------
// In-memory cache with TTL and size limits
// Cache format: `${from}/${to}` → { rate, fetchedAt, source }
// ---------------------------------------------------------------------------

interface CacheEntry {
  rate: SpotRate
  source: 'primary' | 'fallback'
}

const rateCache = new Map<string, CacheEntry>()

function getCached(from: string, to: string): SpotRate | null {
  const key = `${from}/${to}`
  const entry = rateCache.get(key)
  if (!entry) return null

  // Check TTL — stale entries are deleted on read, not on write
  if (Date.now() - entry.rate.fetchedAt > RATE_CACHE_TTL_MS) {
    rateCache.delete(key)
    return null
  }

  return entry.rate
}

function setCache(rate: SpotRate, source: 'primary' | 'fallback'): void {
  const key = `${rate.base}/${rate.target}`

  // Evict oldest 50 entries if cache is about to exceed 500
  if (rateCache.size >= 500) {
    const entries = Array.from(rateCache.entries())
      .sort((a, b) => a[1].rate.fetchedAt - b[1].rate.fetchedAt)
      .slice(0, 50)

    entries.forEach(([k]) => rateCache.delete(k))
  }

  rateCache.set(key, { rate, source })
}

function throwRateError(code: string, message: string): never {
  const error = new Error(message) as any
  error.code = 'RATE_UNAVAILABLE'
  error.retryable = code === '429' || code === '503' || code === 'TIMEOUT'
  throw error
}

// ---------------------------------------------------------------------------
// ExchangeRate-API primary client
// ---------------------------------------------------------------------------

async function fetchFromExchangeRateApi(from: string, to: string): Promise<SpotRate> {
  const env = await import('@/config/env').then((m) => m.env)
  const apiKey = env.EXCHANGERATE_API_KEY

  const url = `${EXCHANGERATE_BASE_URL}/${apiKey}/pair/${from}/${to}`
  let response: Response

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    response = await fetch(url, {
      signal: controller.signal,
    } as RequestInit)

    clearTimeout(timeoutId)
  } catch (err) {
    throwRateError('TIMEOUT', 'ExchangeRate-API request timed out')
  }

  // Handle API errors with specific codes
  if (response.status === 429) {
    throwRateError('429', 'ExchangeRate-API rate limit exceeded')
  }

  if (response.status === 401 || response.status === 403) {
    throwRateError(String(response.status), 'Check EXCHANGERATE_API_KEY in environment')
  }

  if (!response.ok) {
    throwRateError(String(response.status), `ExchangeRate-API error: ${response.status}`)
  }

  // Validate response shape
  let json: unknown
  try {
    json = await response.json()
  } catch (err) {
    throwRateError('PARSE', 'ExchangeRate-API response was not valid JSON')
  }

  const parsed = PairRateSchema.safeParse(json)
  if (!parsed.success) {
    throwRateError('SCHEMA', 'ExchangeRate-API response shape unexpected — check API version')
  }

  return {
    base: parsed.data.base_code,
    target: parsed.data.target_code,
    rate: parsed.data.conversion_rate,
    fetchedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Frankfurter fallback (ECB data, free, no key required)
// Docs: https://frankfurter.app/docs
// ---------------------------------------------------------------------------

async function fetchFromFrankfurter(from: string, to: string): Promise<SpotRate> {
  const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`

  let response: Response
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    response = await fetch(url, { signal: controller.signal })

    clearTimeout(timeoutId)
  } catch (err) {
    throwRateError('TIMEOUT', 'Frankfurter fallback request timed out')
  }

  if (response.status === 422) {
    throwRateError('422', `Currency pair not available in fallback source: ${from}/${to}`)
  }

  if (!response.ok) {
    throwRateError(String(response.status), `Frankfurter fallback error: ${response.status}`)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (err) {
    throwRateError('PARSE', 'Frankfurter response was not valid JSON')
  }

  const parsed = FrankfurterRateSchema.safeParse(json)
  if (!parsed.success) {
    throwRateError('SCHEMA', 'Frankfurter response shape unexpected')
  }

  const rate = parsed.data.rates[to]
  if (typeof rate !== 'number') {
    throwRateError('NOTFOUND', `Frankfurter: no rate found for ${from}/${to}`)
  }

  return {
    base: from,
    target: to,
    rate,
    fetchedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the exchange rate between two currencies.
 * Sanitises input, checks cache, tries primary API, falls back to secondary.
 * Logs every fetch to the audit trail.
 *
 * @param from - Source currency code (e.g. "NGN")
 * @param to - Target currency code (e.g. "USD")
 * @param sessionId - Session context for audit logging
 * @returns SpotRate object with rate and metadata
 * @throws AppError if both primary and fallback fail
 */
export async function fetchPairRate(
  from: string,
  to: string,
  sessionId?: string,
): Promise<SpotRate> {
  const session = sessionId ?? 'anonymous'

  // Step 1: Sanitise both inputs
  try {
    sanitiseCurrency(from)
    sanitiseCurrency(to)
  } catch (err: any) {
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.fetch',
      resource_type: null,
      resource_id: null,
      outcome: 'failure',
      metadata: { from, to, error: err.message },
      user_agent: 'server',
    })
    throw err
  }

  // Step 2: Same-currency check — return 1.0 rate
  if (from === to) {
    const rate: SpotRate = { base: from, target: to, rate: 1, fetchedAt: Date.now() }
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.fetch',
      resource_type: null,
      resource_id: null,
      outcome: 'success',
      metadata: { from, to, source: 'same_currency' },
      user_agent: 'server',
    })
    return rate
  }

  // Step 3: Check cache
  const cached = getCached(from, to)
  if (cached) {
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.cache_hit',
      resource_type: null,
      resource_id: null,
      outcome: 'success',
      metadata: { from, to },
      user_agent: 'server',
    })
    return cached
  }

  // Step 4: Try primary client
  let primaryError: Error | null = null
  let rate: SpotRate | null = null

  try {
    rate = await fetchFromExchangeRateApi(from, to)
    setCache(rate, 'primary')
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.fetch',
      resource_type: null,
      resource_id: null,
      outcome: 'success',
      metadata: { source: 'primary', from, to },
      user_agent: 'server',
    })
    return rate
  } catch (err: any) {
    primaryError = err
    console.warn('[ExchangeRate-API] failed, trying fallback:', err.message)
  }

  // Step 5: Try fallback client
  try {
    rate = await fetchFromFrankfurter(from, to)
    setCache(rate, 'fallback')
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.fetch',
      resource_type: null,
      resource_id: null,
      outcome: 'success',
      metadata: {
        source: 'fallback',
        from,
        to,
        primaryError: primaryError?.message ?? 'unknown',
      },
      user_agent: 'server',
    })
    return rate
  } catch (err: any) {
    // Both failed — log failure and re-throw fallback error
    writeAudit({
      session_id: session,
      ip_address: 'server-side',
      action: 'rate.fetch',
      resource_type: null,
      resource_id: null,
      outcome: 'failure',
      metadata: {
        from,
        to,
        primaryError: primaryError?.message ?? 'unknown',
        fallbackError: err.message ?? 'unknown',
      },
      user_agent: 'server',
    })
    throw err
  }
}

/**
 * Convert an amount from one currency to USD.
 * Sanitises both inputs before making API call.
 *
 * @param amount - Amount in source currency
 * @param currency - Source currency code
 * @param sessionId - Session context for audit logging
 * @returns USD-equivalent amount (rounded to 8 decimal places)
 */
export async function toUsd(
  amount: number,
  currency: string,
  sessionId?: string,
): Promise<number> {
  sanitiseAmount(amount)
  sanitiseCurrency(currency)

  if (currency === 'USD') return amount

  const rate = await fetchPairRate(currency, 'USD', sessionId)
  // Round to 8 decimal places to avoid floating-point accumulation
  return Math.round(amount * rate.rate * 1e8) / 1e8
}

/**
 * Check whether a currency code is likely supported.
 * This is a format check only, not a live availability check.
 * No API call is made.
 *
 * @param currency - Currency code to check
 * @returns true if format is valid (3 uppercase letters)
 */
export function isCurrencySupported(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency)
}

// ---------------------------------------------------------------------------
// Test documentation
// ---------------------------------------------------------------------------

/**
 * Example: fetchPairRate('NGN', 'USD')
 *
 * Expected output (cache miss, primary success):
 * {
 *   base: 'NGN',
 *   target: 'USD',
 *   rate: 0.000645,    // approximate
 *   fetchedAt: 1705929600000
 * }
 *
 * Audit records written:
 * 1. rate.fetch: outcome='success', metadata={source:'primary', from:'NGN', to:'USD'}
 *
 * Example: toUsd(500000, 'NGN')
 * Expected output: ~322.5 USD
 * Computation: 500000 * 0.000645 = 322.5
 */
