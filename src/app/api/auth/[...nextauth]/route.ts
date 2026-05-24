/**
 * NextAuth.js v5 Route Handlers
 *
 * Exports the core NextAuth handlers for sign-in, sign-out, and callback routes.
 * URL: /api/auth/[...nextauth]
 */

import { handlers } from '@/auth'

export const { GET, POST } = handlers
