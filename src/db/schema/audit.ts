/**
 * Audit schema — immutable append-only audit log
 *
 * This is a separate schema with a restricted Postgres role that has
 * INSERT privilege but NOT UPDATE or DELETE.
 *
 * The audit_log table is append-only by design. Triggers prevent modification.
 */

import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'

export const auditSchema = pgSchema('audit')

export const auditLog = auditSchema.table('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Not a FK — survive user deletion
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: varchar('user_agent', { length: 200 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'hedge_signal.create'
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 100 }),
  outcome: varchar('outcome', { length: 20 }).notNull(), // 'success' | 'failure' (enforced by check constraint)
  metadata: jsonb('metadata'), // action-specific, non-PII only
  serverTimestamp: timestamp('server_timestamp').notNull().defaultNow(),
})

export type AuditRecord = typeof auditLog.$inferSelect
export type AuditRecordInsert = typeof auditLog.$inferInsert

/**
 * SQL trigger to prevent UPDATE/DELETE on audit_log (append-only)
 *
 * This is NOT managed by Drizzle — it must be created via a migration script.
 *
 * CREATE OR REPLACE FUNCTION audit_prevent_modification()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   RAISE EXCEPTION 'Audit log is append-only. No modifications allowed.';
 * END;
 * $$ LANGUAGE plpgsql;
 *
 * CREATE TRIGGER audit_update_trigger
 *   BEFORE UPDATE ON audit.audit_log
 *   FOR EACH ROW
 *   EXECUTE FUNCTION audit_prevent_modification();
 *
 * CREATE TRIGGER audit_delete_trigger
 *   BEFORE DELETE ON audit.audit_log
 *   FOR EACH ROW
 *   EXECUTE FUNCTION audit_prevent_modification();
 *
 * Check constraint:
 * ALTER TABLE audit.audit_log
 *   ADD CONSTRAINT audit_log_outcome_check
 *   CHECK (outcome IN ('success', 'failure'));
 */
