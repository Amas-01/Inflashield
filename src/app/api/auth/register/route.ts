/**
 * POST /api/auth/register
 *
 * User registration endpoint.
 * Creates new user with bcrypt-hashed password.
 * Returns session token on success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { UserRepository } from '@/db/repositories/UserRepository'
import { writeAudit } from '@/lib/audit/logger'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = registerSchema.safeParse(body)

    if (!validated.success) {
      await writeAudit({
        userId: 'system',
        sessionId: null,
        action: 'auth.register_invalid',
        resourceType: 'user',
        outcome: 'failure',
        metadata: {
          error: validated.error.message,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, confirmPassword } = validated.data

    // Verify passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const userRepo = new UserRepository()
    const existingUser = await userRepo.findByEmail(email)

    if (existingUser) {
      await writeAudit({
        userId: 'system',
        sessionId: null,
        action: 'auth.register_duplicate',
        resourceType: 'user',
        outcome: 'failure',
        metadata: {
          email,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcryptjs.hash(password, saltRounds)

    // Create user
    const newUser = await userRepo.create({
      email,
      passwordHash,
      role: 'user',
    })

    if (!newUser) {
      throw new Error('Failed to create user')
    }

    // Audit log success
    await writeAudit({
      userId: newUser.id,
      sessionId: null,
      action: 'auth.register_success',
      resourceType: 'user',
      resourceId: newUser.id,
      outcome: 'success',
      metadata: {
        email,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    // TODO: Issue JWT token and set secure HttpOnly cookie
    // For now, return minimal response
    return NextResponse.json(
      {
        success: true,
        userId: newUser.id,
        email: newUser.email,
        message: 'Registration successful. Please log in.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    await writeAudit({
      userId: 'system',
      sessionId: null,
      action: 'auth.register_error',
      resourceType: 'user',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
