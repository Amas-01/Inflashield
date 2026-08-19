/**
 * NextAuth.js v5 Route Handlers
 *
 * Exports the core NextAuth handlers for sign-in, sign-out, and callback routes.
 * URL: /api/auth/[...nextauth]
 */

import { handlers } from '@/auth'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'

export const { GET, POST } = handlers
