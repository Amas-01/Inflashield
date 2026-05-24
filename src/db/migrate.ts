/**
 * Database migration runner
 *
 * This script runs Drizzle migrations to set up the database schema.
 * Usage: npm run db:migrate
 *
 * For development, use: npm run db:push (auto-generates and applies migrations)
 */

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getDb } from '@/db/connection'
import path from 'path'

async function runMigrations() {
  console.log('[DB] Running migrations...')

  try {
    const migrationsFolder = path.join(process.cwd(), 'drizzle')
    await migrate(getDb(), { migrationsFolder })
    console.log('[DB] ✅ Migrations completed successfully')
  } catch (error) {
    console.error('[DB] ❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
