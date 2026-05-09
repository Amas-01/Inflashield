/**
 * scripts/checkApis.ts
 *
 * Run with: npm run check:apis
 *
 * Verifies that all configured API keys are valid and the services are reachable.
 * Use this before submitting the demo to catch configuration issues early.
 */

import 'dotenv/config' // Loads .env.local in Node context

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function ok(label: string, detail = '') {
  console.log(`${GREEN}✓${RESET} ${label}${detail ? `  —  ${detail}` : ''}`)
}

function fail(label: string, reason: string) {
  console.log(`${RED}✗${RESET} ${label}  —  ${reason}`)
}

function warn(label: string, reason: string) {
  console.log(`${YELLOW}⚠${RESET} ${label}  —  ${reason}`)
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function checkSoSoValue() {
  const key = process.env.SOSOVALUE_API_KEY
  if (!key) { fail('SoSoValue API', 'SOSOVALUE_API_KEY is not set'); return }

  try {
    const res = await fetch('https://api.sosovalue.com/v1/indexes?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      const data = await res.json()
      ok('SoSoValue API', `${data.total ?? '?'} indices available`)
    } else {
      fail('SoSoValue API', `HTTP ${res.status}`)
    }
  } catch (e) {
    fail('SoSoValue API', String(e))
  }
}

async function checkSoDEX() {
  const key = process.env.SODEX_API_KEY
  const env = process.env.SODEX_ENV ?? 'testnet'
  if (!key) { fail('SoDEX API', 'SODEX_API_KEY is not set'); return }

  const base = env === 'mainnet' ? 'https://api.sodex.com' : 'https://testnet-api.sodex.com'

  try {
    const res = await fetch(`${base}/v1/portfolio`, {
      headers: { 'X-API-Key': key },
    })
    if (res.ok) {
      ok('SoDEX API', `Connected to ${env}`)
    } else {
      fail('SoDEX API', `HTTP ${res.status} on ${env}`)
    }
  } catch (e) {
    fail('SoDEX API', String(e))
  }
}

async function checkExchangeRate() {
  const key = process.env.EXCHANGERATE_API_KEY
  if (!key) { fail('ExchangeRate-API', 'EXCHANGERATE_API_KEY is not set'); return }

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/NGN/USD`)
    if (res.ok) {
      const data = await res.json()
      ok('ExchangeRate-API', `NGN → USD: ${data.conversion_rate?.toFixed(6) ?? '?'}`)
    } else {
      fail('ExchangeRate-API', `HTTP ${res.status}`)
    }
  } catch (e) {
    fail('ExchangeRate-API', String(e))
  }
}

async function checkAI() {
  const provider = process.env.AI_PROVIDER
  const key = process.env.AI_API_KEY

  if (!provider) {
    warn('AI provider', 'Not configured — template rationale will be used (this is fine)')
    return
  }

  if (provider !== 'ollama' && !key) {
    fail(`AI (${provider})`, 'AI_API_KEY is not set')
    return
  }

  try {
    // Light ping — just check the API is reachable with a minimal request
    switch (provider) {
      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        res.ok ? ok('Groq AI', 'Connected') : fail('Groq AI', `HTTP ${res.status}`)
        break
      }
      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        )
        res.ok ? ok('Google Gemini', 'Connected') : fail('Google Gemini', `HTTP ${res.status}`)
        break
      }
      case 'ollama': {
        const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
        const res = await fetch(`${base}/api/tags`)
        res.ok ? ok('Ollama (local)', 'Running') : fail('Ollama', `HTTP ${res.status}`)
        break
      }
      default:
        warn(`AI (${provider})`, 'Unknown provider — cannot verify')
    }
  } catch (e) {
    fail(`AI (${provider})`, String(e))
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log('\nInflaShield — API connectivity check\n')
  await checkSoSoValue()
  await checkSoDEX()
  await checkExchangeRate()
  await checkAI()
  console.log()
}

main().catch(console.error)
