/**
 * POST /api/hedge
 *
 * Runs the full hedge scoring pipeline:
 * 1. Extract session and validate permissions
 * 2. Sanitise all inputs
 * 3. Fetch FX rate (currency → USD)
 * 4. Fetch SSI index list + performance data
 * 5. Score and rank indices
 * 6. Build allocation plan
 * 7. Optionally enrich with AI rationale
 * 8. Return HedgeSignal
 *
 * Every action is logged to the audit trail.
 * Cache-Control: no-store prevents hedge signals from being cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/config/env'
import { extractSession } from '@/lib/session/extractSession'
import { can } from '@/config/permissions'
import {
  sanitiseCurrency,
  sanitiseAmount,
  sanitiseRiskLevel,
  sanitiseLocale,
} from '@/lib/security/sanitise'
import { writeAudit } from '@/lib/audit/logger'
import { toUsd } from '@/lib/api/exchangeRate'
import { fetchIndexList, fetchIndexPerformanceBatch } from '@/lib/api/sosovalue'
import { scoreIndices, buildHedgeSignal, buildTemplateRationale } from '@/lib/engine/hedgeEngine'
import { PERFORMANCE_WINDOW } from '@/config/constants'
import type { HedgeSignal } from '@/lib/types'

// ---------------------------------------------------------------------------
// AI enrichment (optional)
// ---------------------------------------------------------------------------

async function enrichWithAi(
  signal: Omit<HedgeSignal, 'rationale' | 'rationaleIsAiGenerated'>,
  locale?: string,
): Promise<string> {
  try {
    if (!env.AI_PROVIDER) return ''
    const { generateRationale } = await import('@/lib/ai/explainer')
    return await generateRationale(signal, locale)
  } catch (err: any) {
    console.warn('[AI enrichment] failed, using template fallback:', err.message)
    return ''
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Extract session
  const session = extractSession(request)

  // 2. Check permissions
  if (!can('guest', 'create', 'hedge_signal')) {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'hedge_signal.create',
      resource_type: 'hedge_signal',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'permission_denied' },
      user_agent: session.userAgent,
    })
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // 3. Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'hedge_signal.create',
      resource_type: 'hedge_signal',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'invalid_json' },
      user_agent: session.userAgent,
    })
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Sanitise EVERY field using sanitisE functions (not Zod)
  let currency: string
  let amount: number
  let riskLevel: string
  let locale: string | undefined

  try {
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be an object')
    }

    const bodyRecord = body as Record<string, unknown>
    currency = sanitiseCurrency(bodyRecord.currency)
    amount = sanitiseAmount(bodyRecord.amount)
    riskLevel = sanitiseRiskLevel(bodyRecord.riskLevel)
    locale = sanitiseLocale(bodyRecord.locale)
  } catch (err: any) {
    const message = err.message || 'Validation failed'
    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'hedge_signal.create',
      resource_type: 'hedge_signal',
      resource_id: null,
      outcome: 'failure',
      metadata: { reason: 'validation_failed', error: message },
      user_agent: session.userAgent,
    })
    return NextResponse.json(
      { message: 'Invalid input', error: message },
      { status: 400 },
    )
  }

  // 5. Write audit record for the request
  writeAudit({
    session_id: session.sessionId,
    ip_address: session.ip,
    action: 'hedge_signal.create',
    resource_type: 'hedge_signal',
    resource_id: null,
    outcome: 'success', // Changed to failure below if needed
    metadata: {
      currency,
      amountLocal: amount,
      riskLevel,
    },
    user_agent: session.userAgent,
  })

  try {
    // 6. Convert local currency amount to USD
    const amountUsd = await toUsd(amount, currency, session.sessionId)

    // 7. Fetch index list and performance in parallel
    const indices = await fetchIndexList(session.sessionId)
    if (indices.length === 0) {
      throw new Error('No indices available for scoring')
    }

    const indexIds = indices.map((i) => i.id)
    const performanceMap = await fetchIndexPerformanceBatch(
      indexIds,
      PERFORMANCE_WINDOW,
      session.sessionId,
    )

    // 8. Score and rank
    const rankedScores = scoreIndices(indices, performanceMap)
    if (rankedScores.length === 0) {
      throw new Error('No indices could be scored')
    }

    // 9. Build signal (without rationale yet)
    const partialSignal = buildHedgeSignal(
      { currency, amount, riskLevel: riskLevel as 'conservative' | 'balanced' | 'aggressive', locale },
      amountUsd,
      rankedScores,
    )

    // 10. Enrich with AI rationale (fails gracefully)
    const aiRationale = await enrichWithAi(partialSignal, locale)
    const topIndex = rankedScores[0]?.index
    const rationale =
      aiRationale ||
      buildTemplateRationale(currency, 'balanced', topIndex)

    // 11. Build complete signal
    const signal: HedgeSignal = {
      ...partialSignal,
      rationale,
      rationaleIsAiGenerated: aiRationale.length > 0,
    }

    // 12. Return response with security headers
    const response = NextResponse.json(signal, { status: 200 })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (err: any) {
    console.error('[/api/hedge] error:', err.message)

    writeAudit({
      session_id: session.sessionId,
      ip_address: session.ip,
      action: 'hedge_signal.create',
      resource_type: 'hedge_signal',
      resource_id: null,
      outcome: 'failure',
      metadata: { error: err.message ?? 'unknown' },
      user_agent: session.userAgent,
    })

    // Don't expose internal error details to client
    return NextResponse.json(
      { message: 'Failed to generate hedge signal. Please try again.' },
      { status: 500 },
    )
  }
}
