/**
 * POST /api/hedge
 *
 * Runs the full hedge scoring pipeline:
 * 1. Validate request
 * 2. Fetch FX rate (currency → USD)
 * 3. Fetch SSI index list + performance data
 * 4. Score and rank indices
 * 5. Build allocation plan
 * 6. Optionally enrich with AI rationale
 * 7. Return HedgeSignal
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { toUsd } from '@/lib/api/exchangeRate'
import { fetchIndexList, fetchIndexPerformanceBatch } from '@/lib/api/sosovalue'
import { scoreIndices, buildHedgeSignal, buildTemplateRationale } from '@/lib/engine/hedgeEngine'
import { PERFORMANCE_WINDOW } from '@/config/constants'
import type { HedgeSignal } from '@/lib/types'

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const HedgeRequestSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  amount: z.number().positive(),
  riskLevel: z.enum(['conservative', 'balanced', 'aggressive']),
  locale: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Optional AI enrichment
// Loads the AI client only if AI_PROVIDER is configured.
// Falls back to template rationale silently if AI is unavailable.
// ---------------------------------------------------------------------------

async function enrichWithAi(
  signal: Omit<HedgeSignal, 'rationale' | 'rationaleIsAiGenerated'>,
  locale?: string,
): Promise<string> {
  const provider = process.env.AI_PROVIDER
  const apiKey = process.env.AI_API_KEY

  if (!provider) return ''

  try {
    // Dynamic import so the module is only loaded when AI is configured
    const { generateRationale } = await import('@/lib/ai/explainer')
    return await generateRationale(signal, locale)
  } catch (err) {
    console.warn('AI enrichment failed, using template fallback:', err)
    return ''
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = HedgeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const req = parsed.data

  try {
    // 2. Convert local currency amount to USD
    const amountUsd = await toUsd(req.amount, req.currency)

    // 3. Fetch index list and performance in parallel
    const indices = await fetchIndexList()
    const indexIds = indices.map((i) => i.id)
    const performanceMap = await fetchIndexPerformanceBatch(indexIds, PERFORMANCE_WINDOW)

    // 4. Score and rank
    const rankedScores = scoreIndices(indices, performanceMap)

    // 5. Build signal (without rationale)
    const partialSignal = buildHedgeSignal(req, amountUsd, rankedScores)

    // 6. Enrich with AI rationale (falls back to template if AI unavailable)
    const aiRationale = await enrichWithAi(partialSignal, req.locale)
    const topIndex = rankedScores[0]?.index
    const rationale =
      aiRationale ||
      buildTemplateRationale(req.currency, req.riskLevel, topIndex)

    // 7. Return complete signal
    const signal: HedgeSignal = {
      ...partialSignal,
      rationale,
      rationaleIsAiGenerated: aiRationale.length > 0,
    }

    return NextResponse.json(signal)
  } catch (err) {
    console.error('/api/hedge error:', err)
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
