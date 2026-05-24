/**
 * POST /api/auth/login
 *
 * User login endpoint.
 * Validates credentials and issues session token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signIn } from '@/auth'
import { writeAudit } from '@/lib/audit/logger'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = loginSchema.safeParse(body)

    if (!validated.success) {
      await writeAudit({
        userId: 'system',
        sessionId: null,
        action: 'auth.login_invalid',
        resourceType: 'session',
        outcome: 'failure',
        metadata: {
          error: validated.error.message,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 }
      )
    }

    const { email, password } = validated.data

    try {
      // Use NextAuth signIn (credentials provider)
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        await writeAudit({
          userId: 'system',
          sessionId: null,
          action: 'auth.login_failure',
          resourceType: 'session',
          outcome: 'failure',
          metadata: {
            email,
            error: result.error,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          },
        })

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // signIn succeeded - redirect will be set via NextAuth session
      await writeAudit({
        userId: 'system', // Will be overridden by session userId after auth
        sessionId: null,
        action: 'auth.login_success',
        resourceType: 'session',
        outcome: 'success',
        metadata: {
          email,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          ok: result?.ok,
        },
        { status: 200 }
      )
    } catch (signInError) {
      console.error('SignIn error:', signInError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Login error:', error)

    await writeAudit({
      userId: 'system',
      sessionId: null,
      action: 'auth.login_error',
      resourceType: 'session',
      outcome: 'failure',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
