/**
 * AI explainer — optional enhancement
 *
 * Generates a plain-English rationale for a hedge signal.
 * Supports multiple providers via the AI_PROVIDER environment variable.
 *
 * If this module throws, the caller falls back to the template rationale.
 * Do not let AI failures propagate to the user.
 *
 * See docs/AI.md for provider comparison and setup instructions.
 */

import type { HedgeSignal } from '@/lib/types'

// ---------------------------------------------------------------------------
// System prompt
// Keep this concise — shorter prompts = faster responses = better UX.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a financial assistant helping everyday people protect their savings from inflation.
You will receive a JSON object describing a recommended on-chain index allocation.
Write a 2-3 sentence plain-English explanation that:
1. Explains WHY this allocation helps protect against the user's currency weakening
2. Describes the risk level honestly in one sentence
3. Uses NO financial jargon — write as if explaining to a non-investor

Rules:
- Do not invent numbers. Only reference values present in the JSON.
- Do not mention SoDEX or testnet in the rationale (the UI handles that).
- If a "locale" field is present, write in that language. Otherwise write in English.
- Maximum 80 words.
`.trim()

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callGroq(prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) throw new Error(`Groq error: ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(5000),
    },
  )

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callAnthropic(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.AI_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) throw new Error(`Anthropic error: ${response.status}`)
  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

async function callOllama(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL ?? 'llama3.2'

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
      stream: false,
    }),
    signal: AbortSignal.timeout(15000), // Ollama can be slower
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
  const data = await response.json()
  return data.response ?? ''
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a plain-English rationale for the given hedge signal.
 * Throws on failure — caller should catch and fall back to template.
 */
export async function generateRationale(
  signal: Omit<HedgeSignal, 'rationale' | 'rationaleIsAiGenerated'>,
  locale?: string,
): Promise<string> {
  const provider = process.env.AI_PROVIDER

  const context = JSON.stringify({
    currency: signal.currency,
    riskLevel: signal.riskLevel,
    locale: locale ?? 'en',
    allocations: signal.allocations.map((a) => ({
      name: a.indexName,
      weight: a.weight,
    })),
    topIndexScore: signal.indexScores[0]
      ? {
          inflationHedgeScore: signal.indexScores[0].inflationCorrelation,
          riskAdjustedReturn: signal.indexScores[0].riskAdjustedReturn,
          liquidity: signal.indexScores[0].liquidityScore,
        }
      : null,
  })

  switch (provider) {
    case 'groq':
      return callGroq(context)
    case 'gemini':
      return callGemini(context)
    case 'anthropic':
      return callAnthropic(context)
    case 'ollama':
      return callOllama(context)
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}
