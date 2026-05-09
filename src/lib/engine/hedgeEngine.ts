/**
 * Hedge engine
 *
 * The rule-based core of InflaShield. Scores SSI indices as inflation hedges
 * for a given currency and produces an allocation plan.
 *
 * This module has NO external dependencies — no API calls, no AI.
 * It takes typed inputs and returns typed outputs.
 * AI enrichment is applied downstream in the API route.
 */

import { SCORING_WEIGHTS, RISK_PROFILES, PERFORMANCE_WINDOW } from '@/config/constants'
import type {
  SSIIndex,
  IndexPerformance,
  IndexScore,
  HedgeSignal,
  HedgeRequest,
  AllocationItem,
  RiskLevel,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Compute the Pearson correlation coefficient between two numeric series.
 * Returns 0 if either series is too short or has zero variance.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 3) return 0

  const xs = x.slice(0, n)
  const ys = y.slice(0, n)

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  const num = xs.reduce((sum, xi, i) => sum + (xi - meanX) * (ys[i] - meanY), 0)
  const denomX = Math.sqrt(xs.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0))
  const denomY = Math.sqrt(ys.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0))

  if (denomX === 0 || denomY === 0) return 0
  return num / (denomX * denomY)
}

/**
 * Compute a simple Sharpe-like ratio: mean return / std deviation.
 * Higher is better.
 */
function riskAdjustedReturn(returns: number[]): number {
  if (returns.length < 2) return 0

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0
  return mean / stdDev
}

/**
 * Normalise a value to 0–100 given the min and max of a set.
 */
function normalise(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

// ---------------------------------------------------------------------------
// Inflation correlation
//
// Logic: if a user's currency is weakening against USD, good hedge indices
// should be going UP in USD terms at the same time.
//
// We approximate this by using the index's historical USD returns as X, and
// constructing a synthetic "currency weakness" series as Y (1 - normalised rate).
// In Phase 1, we don't have historical FX data, so we use the index's own
// 30-day return as a proxy for inflation-hedging quality, weighted by volatility.
// Phase 2 will plug in actual historical FX data for a more accurate correlation.
// ---------------------------------------------------------------------------

function computeInflationCorrelationScore(
  index: SSIIndex,
  performance: IndexPerformance | undefined,
): number {
  // If we have performance data, use the returns series quality as a signal.
  // A good inflation hedge has positive returns and low drawdown.
  if (performance && performance.dataPoints.length >= 5) {
    const returns = performance.dataPoints.map((p) => p.returnPct)
    const positiveReturnDays = returns.filter((r) => r > 0).length
    const positivityRatio = positiveReturnDays / returns.length

    // Combine: positive-day ratio (how often it's going up) +
    //          inverse of max drawdown magnitude (lower drawdown = better hedge)
    const drawdownPenalty = Math.abs(index.riskMetrics.maxDrawdown90d)
    return Math.max(0, positivityRatio * 100 - drawdownPenalty * 20)
  }

  // Fallback: use 30-day return as a simple proxy
  return Math.max(0, index.return30d * 200)
}

// ---------------------------------------------------------------------------
// Public scoring API
// ---------------------------------------------------------------------------

/**
 * Score a list of SSI indices as inflation hedges.
 * Returns indices sorted best-first.
 */
export function scoreIndices(
  indices: SSIIndex[],
  performanceMap: Map<string, IndexPerformance>,
): IndexScore[] {
  // Compute raw scores
  const rawScores = indices.map((index) => {
    const performance = performanceMap.get(index.id)
    const inflationCorrelation = computeInflationCorrelationScore(index, performance)

    const returns = performance?.dataPoints.map((p) => p.returnPct) ?? []
    const rar = riskAdjustedReturn(returns)

    return {
      index,
      inflationCorrelation,
      riskAdjustedReturnRaw: rar,
      liquidityRaw: index.tvlUsd,
    }
  })

  // Normalise each dimension to 0–100 across the set
  const minIC = Math.min(...rawScores.map((s) => s.inflationCorrelation))
  const maxIC = Math.max(...rawScores.map((s) => s.inflationCorrelation))
  const minRAR = Math.min(...rawScores.map((s) => s.riskAdjustedReturnRaw))
  const maxRAR = Math.max(...rawScores.map((s) => s.riskAdjustedReturnRaw))
  const minLiq = Math.min(...rawScores.map((s) => s.liquidityRaw))
  const maxLiq = Math.max(...rawScores.map((s) => s.liquidityRaw))

  return rawScores
    .map(({ index, inflationCorrelation, riskAdjustedReturnRaw, liquidityRaw }) => {
      const icNorm = normalise(inflationCorrelation, minIC, maxIC)
      const rarNorm = normalise(riskAdjustedReturnRaw, minRAR, maxRAR)
      const liqNorm = normalise(liquidityRaw, minLiq, maxLiq)

      const score =
        icNorm * SCORING_WEIGHTS.inflationCorrelation +
        rarNorm * SCORING_WEIGHTS.riskAdjustedReturn +
        liqNorm * SCORING_WEIGHTS.liquidity

      return {
        index,
        score: Math.round(score),
        inflationCorrelation: Math.round(icNorm),
        riskAdjustedReturn: Math.round(rarNorm),
        liquidityScore: Math.round(liqNorm),
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Build an allocation plan from a ranked list of index scores.
 * Respects the risk profile's index count and weight caps.
 */
export function buildAllocation(
  rankedScores: IndexScore[],
  totalUsd: number,
  riskLevel: RiskLevel,
): AllocationItem[] {
  const profile = RISK_PROFILES[riskLevel]
  const selected = rankedScores.slice(0, profile.maxIndexCount)

  const totalScore = selected.reduce((sum, s) => sum + s.score, 0)

  return selected.map(({ index, score }) => {
    const rawWeight = totalScore > 0 ? score / totalScore : 1 / selected.length
    const cappedWeight = Math.min(rawWeight, profile.maxSingleWeight)
    return {
      indexId: index.id,
      indexName: index.name,
      indexSymbol: index.symbol,
      weight: Math.round(cappedWeight * 100) / 100,
      amountUsd: Math.round(totalUsd * cappedWeight * 100) / 100,
    }
  })
}

/**
 * Template rationale — used when AI is not configured.
 * Produces a deterministic, plain-English explanation from the signal data.
 */
export function buildTemplateRationale(
  currency: string,
  riskLevel: RiskLevel,
  topIndex: SSIIndex,
): string {
  const riskPhrases: Record<RiskLevel, string> = {
    conservative: 'spread across multiple indices to reduce single-asset risk',
    balanced: 'balanced between two top-performing indices',
    aggressive: 'concentrated in the single highest-scoring index for maximum hedge potential',
  }

  return (
    `To protect savings held in ${currency} from inflation and currency depreciation, ` +
    `this allocation is ${riskPhrases[riskLevel]}. ` +
    `The top selection, ${topIndex.name}, showed a ${(topIndex.return30d * 100).toFixed(1)}% ` +
    `return over the past 30 days with an inflation-hedge score indicating positive ` +
    `performance during periods of USD strength. ` +
    `This is a simulated allocation on SoDEX testnet — no real funds are at risk.`
  )
}

/**
 * Main entry point — combines scoring and allocation into a HedgeSignal.
 * AI enrichment is applied by the caller after this function returns.
 */
export function buildHedgeSignal(
  request: HedgeRequest,
  amountUsd: number,
  rankedScores: IndexScore[],
): Omit<HedgeSignal, 'rationale' | 'rationaleIsAiGenerated'> {
  const allocations = buildAllocation(rankedScores, amountUsd, request.riskLevel)

  return {
    currency: request.currency,
    amountUsd: Math.round(amountUsd * 100) / 100,
    riskLevel: request.riskLevel,
    allocations,
    indexScores: rankedScores,
    generatedAt: new Date().toISOString(),
  }
}
