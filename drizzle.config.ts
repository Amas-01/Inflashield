import type { Config } from 'drizzle-kit'

const config = {
  schema: ['./src/db/schema/app.ts', './src/db/schema/audit.ts'],
  out: './drizzle',
  driver: 'pg' as const,
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/inflashield',
  },
  verbose: true,
  strict: true,
} satisfies Config

export default config

