/**
 * GET /api/backtest
 *
 * Run backtesting analysis on user's hedge signals
 * Optional query parameters: startDate, endDate (ISO 8601), currency
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { backtestingEngine } from '@/lib/engine/backtestingEngine'

// Force Node.js runtime to avoid Edge Runtime compatibility issues
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const currency = searchParams.get('currency') || undefined

    const options: any = {}

    if (startDateStr) {
      const date = new Date(startDateStr)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate format' }, { status: 400 })
      }
      options.startDate = date
    }

    if (endDateStr) {
      const date = new Date(endDateStr)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate format' }, { status: 400 })
      }
      options.endDate = date
    }

    if (currency) {
      options.currency = currency
    }

    // Run backtest
    const result = await backtestingEngine.runBacktest(userId, options)

    return NextResponse.json(
      {
        success: true,
        backtest: result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json({ error: 'Backtest failed' }, { status: 500 })
  }
}
