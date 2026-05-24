/**
 * InflaShield — Role-based Access Control (RBAC) foundation
 *
 * Phase 1 is guest-only (no authentication), but this permission model
 * is designed to scale to Phase 2 (user login) and Phase 3 (admin dashboard).
 * The structure must not change between phases — only the enforcement layer.
 */

export type ResourceType = 'hedge_signal' | 'order' | 'portfolio' | 'audit_log'
export type ActionType = 'create' | 'read' | 'execute' | 'export'
export type RoleType = 'guest' | 'user' | 'admin'

/**
 * Permission matrix: role → resource → allowed actions
 *
 * In Phase 1, all users are guests (unauthenticated).
 * Phase 2: introduces user (logged-in) and admin roles.
 * Phase 3: introduces scoped audit log access (read own records only by default).
 */
export const PERMISSIONS: Record<RoleType, Record<ResourceType, ActionType[]>> = {
  guest: {
    hedge_signal: ['create', 'read'],
    order: ['execute'],              // testnet only — enforced at the API route level
    portfolio: [],                   // Phase 2: wallet connect
    audit_log: [],                   // Phase 2: anonymous user tracking
  },
  user: {
    hedge_signal: ['create', 'read', 'export'],
    order: ['create', 'read', 'execute'],
    portfolio: ['read'],
    audit_log: ['read'],             // own records only — enforced by API layer
  },
  admin: {
    hedge_signal: ['create', 'read', 'export'],
    order: ['create', 'read', 'execute', 'export'],
    portfolio: ['read', 'export'],
    audit_log: ['read', 'export'],   // all records
  },
}

/**
 * Check if a role has permission to perform an action on a resource.
 * Used by API routes to gate access before processing.
 */
export function can(
  role: RoleType,
  action: ActionType,
  resource: ResourceType,
): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false
}
