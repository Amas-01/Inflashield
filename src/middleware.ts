/**
 * Middleware — Route protection and session injection
 *
 * Protects authenticated routes and injects session context.
 * All /api/v1/* routes require authentication by default.
 */

import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth']
const UNPROTECTED_API_ROUTES = ['/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes and static assets
  if (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Check authentication for protected API routes
  if (pathname.startsWith('/api') && !UNPROTECTED_API_ROUTES.some((route) => pathname.startsWith(route))) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clone request and add session to headers for downstream handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(
      'x-user-id',
      session.user.id || ''
    )
    requestHeaders.set(
      'x-user-role',
      (session.user.role as string) || 'user'
    )

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next|public|favicon).*)',
  ],
}
