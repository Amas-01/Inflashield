/**
 * Application schema — users, sessions, signals, orders
 *
 * All tables include a user_id column for data isolation.
 * Every query filters by user_id — this is the primary security boundary.
 */

import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  numeric,
  boolean,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const appSchema = pgSchema('app')

// ─────────────────────────────────────────────────────────────────────────────
// Users table
// ─────────────────────────────────────────────────────────────────────────────

export const users = appSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(), // bcrypt
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Sessions table
// ─────────────────────────────────────────────────────────────────────────────

export const sessions = appSchema.table('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
  }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
  userAgent: varchar('user_agent', { length: 200 }),
})

export type Session = typeof sessions.$inferSelect
export type SessionInsert = typeof sessions.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Hedge Signals table
// ─────────────────────────────────────────────────────────────────────────────

export const hedgeSignals = appSchema.table(
  'hedge_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, {
      onDelete: 'cascade',
    }),
    currency: varchar('currency', { length: 3 }).notNull(),
    amountUsd: numeric('amount_usd', { precision: 20, scale: 8 }).notNull(),
    riskLevel: varchar('risk_level', { length: 20 }).notNull(), // 'conservative' | 'balanced' | 'aggressive'
    signalJson: jsonb('signal_json').notNull(), // Full HedgeSignal stored as JSON
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table: any): any => ({
    userCreatedIdx: index('hedge_signals_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
  })
)

export type HedgeSignal = typeof hedgeSignals.$inferSelect
export type HedgeSignalInsert = typeof hedgeSignals.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Orders table
// ─────────────────────────────────────────────────────────────────────────────

export const orders = appSchema.table(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, {
      onDelete: 'cascade',
    }),
    signalId: uuid('signal_id').references(() => hedgeSignals.id, {
      onDelete: 'set null',
    }),
    sodexOrderId: varchar('sodex_order_id', { length: 100 }),
    indexId: varchar('index_id', { length: 100 }).notNull(),
    amountUsd: numeric('amount_usd', { precision: 20, scale: 8 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('submitted'), // 'submitted' | 'pending' | 'filled' | 'rejected' | 'cancelled'
    network: varchar('network', { length: 20 }).notNull().default('testnet'), // 'testnet' | 'mainnet'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table: any): any => ({
    userCreatedIdx: index('orders_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
  })
)

export type Order = typeof orders.$inferSelect
export type OrderInsert = typeof orders.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Notification Preferences table
// ─────────────────────────────────────────────────────────────────────────────

export const notificationPreferences = appSchema.table('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  telegramChatId: varchar('telegram_chat_id', { length: 100 }),
  notifyOnRebalance: boolean('notify_on_rebalance').notNull().default(true),
  notifyThresholdPct: numeric('notify_threshold_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('10.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type NotificationPreferences = typeof notificationPreferences.$inferSelect
export type NotificationPreferencesInsert = typeof notificationPreferences.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Wallets table
// ─────────────────────────────────────────────────────────────────────────────

export const wallets = appSchema.table(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, {
      onDelete: 'cascade',
    }),
    address: varchar('address', { length: 42 }).notNull(), // Ethereum address
    chainId: integer('chain_id').notNull(),
    label: varchar('label', { length: 100 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table: any): any => ({
    userAddressChainIdx: index('wallets_user_address_chain_idx').on(
      table.userId,
      table.address,
      table.chainId
    ),
  })
)

export type Wallet = typeof wallets.$inferSelect
export type WalletInsert = typeof wallets.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Relations (for Drizzle query building)
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }: any): any => ({
  sessions: many(sessions),
  signals: many(hedgeSignals),
  orders: many(orders),
  wallets: many(wallets),
  notificationPreferences: many(notificationPreferences),
}))

export const sessionsRelations = relations(sessions, ({ one }: any): any => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const hedgeSignalsRelations = relations(hedgeSignals, ({ one, many }: any): any => ({
  user: one(users, { fields: [hedgeSignals.userId], references: [users.id] }),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one }: any): any => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  signal: one(hedgeSignals, { fields: [orders.signalId], references: [hedgeSignals.id] }),
}))

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }: any): any => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  })
)

export const walletsRelations = relations(wallets, ({ one }: any): any => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}))
