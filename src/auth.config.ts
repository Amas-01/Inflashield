/**
 * NextAuth.js v5 configuration
 *
 * Core authentication setup with JWT-based sessions.
 * Integrates with the app schema (users, sessions tables).
 */

import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

// ─────────────────────────────────────────────────────────────────────────────
// Credential schema validation
// ─────────────────────────────────────────────────────────────────────────────

const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type CredentialsInput = z.infer<typeof credentialsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// NextAuth config
// ─────────────────────────────────────────────────────────────────────────────

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials: any): Promise<any> => {
        // Validate input
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) {
          throw new Error('Invalid credentials format')
        }

        const { email, password } = parsed.data

        // Import repo dynamically to avoid circular dependency
        try {
          const { UserRepository } = await import('@/db/repositories/UserRepository')
          const userRepo = new UserRepository()

          const user = await userRepo.findByEmail(email)
          if (!user) {
            throw new Error('Invalid email or password')
          }

          // Compare password  with bcrypt
          const passwordMatch = await bcryptjs.compare(password, user.passwordHash)
          if (!passwordMatch) {
            throw new Error('Invalid email or password')
          }

          // Return user object for JWT
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Invalid')) {
            throw error
          }
          console.error('Auth error:', error)
          throw new Error('Authentication failed')
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
} satisfies NextAuthConfig
