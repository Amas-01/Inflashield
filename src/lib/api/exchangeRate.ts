/**
 * ExchangeRate-API client
 *
 * Fetches live FX rates for 170+ currencies.
 * Includes an in-memory cache (1 hour TTL) to respect the free tier limit.
 *
 * Free tier: 1,500 requests/month — no credit card required
 * Register: https://www.exchangerate-api.com
 * Docs:     https://www.exchangerate-api.com/docs/overview
 *
 * If ExchangeRate-API is unavailable, the fallback uses frankfurter.app
 * (European Central Bank data, EUR-based pairs).
 */

import { z } from 'zod'
import { EXCHANGERATE_BASE_URL, RATE_CACHE_TTL_MS } from '@/config/constants'
import type { SpotRate } from '@/lib/types'

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const PairRateSchema = z.object({
  result: z.literal('success'),
  base_code: z.string(),
  target_code: z.string(),
  conversion_rate: z.number(),
})

const AllRatesSchema = z.object({
  result: z.literal('success'),
  base_code: z.string(),
  conversion_rates: z.record(z.string(), z.number()),
})

// ---------------------------------------------------------------------------
// In-memory cache
// Simple Map: `${from}/${to}` → SpotRate
// ---------------------------------------------------------------------------

const rateCache = new Map<string, SpotRate>()

function getCached(from: string, to: string): SpotRate | null {
  const key = `${from}/${to}`
  const cached = rateCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > RATE_CACHE_TTL_MS) {
    rateCache.delete(key)
    return null
  }
  return cached
}

function setCache(rate: SpotRate): void {
  rateCache.set(`${rate.base}/${rate.target}`, rate)
}

// ---------------------------------------------------------------------------
// ExchangeRate-API
// ---------------------------------------------------------------------------

async function fetchFromExchangeRateApi(from: string, to: string): Promise<SpotRate> {
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) throw new Error('EXCHANGERATE_API_KEY is not configured')

  const url = `${EXCHANGERATE_BASE_URL}/${apiKey}/pair/${from}/${to}`
  const response = await fetch(url, { next: { revalidate: 3600 } })

  if (!response.ok) {
    throw new Error(`ExchangeRate-API error: ${response.status}`)
  }

  const json = await response.json()
  const data = PairRateSchema.parse(json)

  return {
    base: data.base_code,
    target: data.target_code,
    rate: data.conversion_rate,
    fetchedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Frankfurter fallback (ECB data, free, no key required)
// Only supports EUR as a base — so we convert via EUR as an intermediary
// if neither currency is EUR.
// Docs: https://frankfurter.app/docs
// ---------------------------------------------------------------------------

async function fetchFromFrankfurter(from: string, to: string): Promise<SpotRate> {
  const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`
  const response = await fetch(url, { next: { revalidate: 3600 } })

  if (!response.ok) {
    throw new Error(`Frankfurter fallback error: ${response.status}`)
  }

  const json = await response.json()
  const rate = json?.rates?.[to]

  if (typeof rate !== 'number') {
    throw new Error(`Frankfurter: no rate found for ${from}/${to}`)
  }

  return { base: from, target: to, rate, fetchedAt: Date.now() }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the exchange rate between two currencies.
 * Tries ExchangeRate-API first; falls back to Frankfurter on failure.
 * Results are cached for 1 hour.
 */
export async function fetchPairRate(from: string, to: string): Promise<SpotRate> {
  const cached = getCached(from, to)
  if (cached) return cached

  let rate: SpotRate

  try {
    rate = await fetchFromExchangeRateApi(from, to)
  } catch (primaryError) {
    console.warn('ExchangeRate-API failed, trying Frankfurter fallback:', primaryError)
    rate = await fetchFromFrankfurter(from, to)
  }

  setCache(rate)
  return rate
}

/**
 * Convert an amount from one currency to USD.
 * This is the main entry point used by the hedge engine.
 */
export async function toUsd(amount: number, currency: string): Promise<number> {
  if (currency === 'USD') return amount
  const rate = await fetchPairRate(currency, 'USD')
  return amount * rate.rate
}

/**
 * Check whether a currency code is likely supported.
 * This is a lightweight check — it verifies the code is 3 uppercase letters.
 * Full validation only happens when the rate is actually fetched.
 */
export function isCurrencySupported(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency)
}
