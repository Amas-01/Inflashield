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
import { getClientIp, getUserAgent } from '@/lib/audit/helpers'

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
        session_id: 'system',
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        action: 'auth.login_invalid',
        resource_type: 'session',
        resource_id: null,
        outcome: 'failure',
        metadata: {
          error: validated.error.message,
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
          session_id: 'system',
          ip_address: getClientIp(request),
          user_agent: getUserAgent(request),
          action: 'auth.login_failure',
          resource_type: 'session',
          resource_id: null,
          outcome: 'failure',
          metadata: {
            email,
            error: result.error,
          },
        })

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // signIn succeeded - redirect will be set via NextAuth session
      await writeAudit({
        session_id: 'system',
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        action: 'auth.login_success',
        resource_type: 'session',
        resource_id: null,
        outcome: 'success',
        metadata: {
          email,
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
      session_id: 'system',
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request),
      action: 'auth.login_error',
      resource_type: 'session',
      resource_id: null,
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
