/**
 * Environment variable validator and loader
 *
 * All environment variables are validated at server startup using Zod.
 * If any required variable is missing or invalid, the server exits with
 * a clear error message listing every problem.
 *
 * This module must be imported at the very top of API route files.
 */

import { z } from 'zod'

const EnvSchema = z.object({
  // Required API keys — no defaults
  SOSOVALUE_API_KEY: z.string().min(1, 'SOSOVALUE_API_KEY is required'),
  SODEX_API_KEY: z.string().min(1, 'SODEX_API_KEY is required'),
  EXCHANGERATE_API_KEY: z.string().min(1, 'EXCHANGERATE_API_KEY is required'),

  // Optional: execution environment (default: testnet)
  SODEX_ENV: z
    .enum(['testnet', 'mainnet'])
    .default('testnet')
    .transform((val: any): string => {
      if (val === 'mainnet') {
        console.warn(
          '⚠️  WARNING: SODEX_ENV=mainnet. This will execute REAL transactions on mainnet. ' +
          'If this is unintended, set SODEX_ENV=testnet immediately.',
        )
      }
      return val
    }),

  // Optional: AI provider for response enrichment (none = no AI)
  AI_PROVIDER: z.enum(['groq', 'gemini', 'anthropic', 'ollama']).optional(),
  AI_API_KEY: z.string().optional(),

  // Optional: application defaults
  DEFAULT_CURRENCY: z.string().default('USD'),
  INDEX_FETCH_LIMIT: z.coerce.number().int().min(1).max(50).default(10),

  // Node environment (for framework checks)
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Phase 2: Database configuration (required for user persistence)
  // Local development: postgresql://postgres:postgres@localhost:5432/inflashield
  // Production (Vercel): Auto-configured when you add Vercel Postgres
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  
  // Direct URL for migrations (used during db:push)
  // For local development: same as DATABASE_URL
  // Production: usually same as DATABASE_URL
  DIRECT_URL: z.string().optional(),
  
  // A separate connection string for audit log writes (restricted role with INSERT-only)
  // This role must NOT have UPDATE or DELETE permissions on the audit schema
  DATABASE_AUDIT_URL: z.string().optional(),

  // Phase 2.4: Telegram notifications (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Phase 2.5: Alchemy API key for RPC providers (optional, uses demo endpoints if not set)
  NEXT_PUBLIC_ALCHEMY_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

type Env = z.infer<typeof EnvSchema>

let env: Env

/**
 * Validate and cache environment variables.
 * Run once at module load.
 */
function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((e: any): string => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')

    console.error(
      '\n❌ ENVIRONMENT CONFIGURATION ERROR\n' +
      'The following environment variables are missing or invalid:\n' +
      errors +
      '\n\n' +
      'Please check your .env.local file (see docs/SETUP.md for instructions).\n',
    )

    process.exit(1)
  }

  // Warn if required API keys are placeholder values
  const keys = ['SOSOVALUE_API_KEY', 'SODEX_API_KEY', 'EXCHANGERATE_API_KEY']
  keys.forEach((key) => {
    const val = result.data[key as keyof Env]
    if (typeof val === 'string' && (val === 'your_key_here' || val === 'placeholder')) {
      console.warn(`⚠️  WARNING: ${key} is a placeholder. Configure a real key before deployment.`)
    }
  })

  return result.data
}

env = loadEnv()

/**
 * Exported environment object — use throughout the app.
 * All properties are validated and type-safe.
 *
 * Example usage in an API route:
 *   import { env } from '@/config/env'
 *   const apiKey = env.SOSOVALUE_API_KEY  // ✅ TypeScript ensures this exists
 */
export { env }

/**
 * Get env as function (for dynamic loading scenarios)
 */
export function getEnv(): Env {
  return env
}
