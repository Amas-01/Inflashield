/**
 * NextAuth.js v5 Core
 *
 * Exports the auth function and related utilities for route handlers and middleware.
 */

import NextAuth from 'next-auth'
import config from '@/auth.config'

export const { auth, handlers, signIn, signOut } = NextAuth(config)
