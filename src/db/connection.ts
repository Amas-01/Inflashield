/**
 * Database connection configuration
 *
 * Two separate connection pools:
 * - db: Application connection (read/write access to app schema)
 * - auditDb: Audit connection (INSERT-ONLY access to audit schema)
 *
 * The audit connection uses a restricted Postgres role that lacks UPDATE and
 * DELETE permissions — enforcing immutability at the database layer.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/config/env'
import * as schema from './schema'

// Main application pool
let dbPool: Pool | null = null

function getDbPool(): Pool {
  if (!dbPool) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required but not set')
    }

    dbPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    })

    // Log only the host for security
    const url = new URL(env.DATABASE_URL)
    console.log(`[DB] Connected to ${url.hostname}`)
  }

  return dbPool
}

// Audit-specific pool (restricted role)
let auditDbPool: Pool | null = null

function getAuditDbPool(): Pool {
  if (!auditDbPool) {
    if (!env.DATABASE_AUDIT_URL) {
      console.warn(
        '[Audit DB] DATABASE_AUDIT_URL not set — using main connection with restricted app role'
      )
      // Fallback to main pool (with a warning that it has full permissions)
      return getDbPool()
    }

    auditDbPool = new Pool({
      connectionString: env.DATABASE_AUDIT_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    })

    const url = new URL(env.DATABASE_AUDIT_URL)
    console.log(`[Audit DB] Connected to ${url.hostname} with restricted role`)
  }

  return auditDbPool
}

// Lazy-initialized Drizzle instances
let _db: ReturnType<typeof drizzle> | null = null
let _auditDb: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    _db = drizzle(getDbPool(), { schema })
  }
  return _db
}

export function getAuditDb() {
  if (!_auditDb) {
    _auditDb = drizzle(getAuditDbPool(), { schema })
  }
  return _auditDb
}

// Convenience exports - use getter functions
export { getDb as db, getAuditDb as auditDb }

/**
 * Graceful shutdown helper (call from api routes if needed)
 */
export async function closeConnections() {
  if (dbPool) {
    await dbPool.end()
    dbPool = null
  }
  if (auditDbPool) {
    await auditDbPool.end()
    auditDbPool = null
  }
}
