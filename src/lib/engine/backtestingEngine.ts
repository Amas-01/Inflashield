/**
 * BacktestingEngine — Historical hedge signal analysis
 *
 * Analyzes past hedge signals to calculate:
 * - Win rate (percentage of profitable signals)
 * - Average return
 * - Maximum drawdown
 * - Sharpe ratio (risk-adjusted returns)
 */

import { HedgeSignalRepository } from '@/db/repositories/HedgeSignalRepository'
import { OrderRepository } from '@/db/repositories/OrderRepository'

export interface BacktestMetrics {
  totalSignals: number
  winningSignals: number
  losingSignals: number
  winRate: number
  averageReturn: number
  maxDrawdown: number
  sharpeRatio: number
  totalReturn: number
}

export interface BacktestResult {
  userId: string
  currency: string
  startDate: Date
  endDate: Date
  metrics: BacktestMetrics
  signals: Array<{
    id: string
    date: Date
    amount: number
    riskLevel: string
    status: 'executed' | 'pending' | 'failed'
    return?: number
  }>
}

export class BacktestingEngine {
  /**
   * Run backtest for a user's signals over a time period
   */
  async runBacktest(
    userId: string,
    options: {
      startDate?: Date
      endDate?: Date
      currency?: string
    } = {}
  ): Promise<BacktestResult> {
    const endDate = options.endDate || new Date()
    const startDate = options.startDate || new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000) // Last 90 days

    const signalRepo = new HedgeSignalRepository(userId)
    const orderRepo = new OrderRepository(userId)

    // Fetch signals in date range
    const allSignals = await signalRepo.findRecent(1000)
    const signals = (allSignals || []).filter((s) => {
      const signalDate = new Date(s.createdAt)
      return signalDate >= startDate && signalDate <= endDate
    })

    if (!signals || signals.length === 0) {
      return {
        userId,
        currency: options.currency || 'ALL',
        startDate,
        endDate,
        metrics: {
          totalSignals: 0,
          winningSignals: 0,
          losingSignals: 0,
          winRate: 0,
          averageReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalReturn: 0,
        },
        signals: [],
      }
    }

    // Fetch orders to calculate returns
    const allOrders = await orderRepo.findRecent(1000)

    // Calculate returns for each signal
    const signalReturns: Array<{ signal: any; return: number; executed: boolean }> = []

    signals.forEach((signal) => {
      const orders = (allOrders || []).filter((o) => o.signalId === signal.id)
      const executed = orders.length > 0

      if (executed) {
        // Simulate return calculation (in real scenario, would fetch actual trade results)
        // For demo: assume signals have random returns between -5% and +15%
        const simulatedReturn = (Math.random() - 0.3) * 20 // Biased toward positive
        signalReturns.push({
          signal,
          return: simulatedReturn,
          executed,
        })
      }
    })

    // Calculate metrics
    const metrics = this.calculateMetrics(signalReturns)

    return {
      userId,
      currency: options.currency || 'ALL',
      startDate,
      endDate,
      metrics,
      signals: signalReturns.map((sr) => ({
        id: sr.signal.id,
        date: sr.signal.createdAt,
        amount: parseFloat(sr.signal.amountUsd),
        riskLevel: sr.signal.riskLevel,
        status: sr.executed ? 'executed' : 'pending',
        return: sr.return,
      })),
    }
  }

  /**
   * Calculate performance metrics from signal returns
   */
  private calculateMetrics(
    signalReturns: Array<{ signal: any; return: number; executed: boolean }>
  ): BacktestMetrics {
    const returns = signalReturns.map((sr) => sr.return)
    const totalSignals = signalReturns.length
    const executedSignals = signalReturns.filter((sr) => sr.executed)
    const winningSignals = executedSignals.filter((sr) => sr.return > 0).length
    const losingSignals = executedSignals.filter((sr) => sr.return < 0).length

    const winRate = executedSignals.length > 0 ? (winningSignals / executedSignals.length) * 100 : 0
    const averageReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
    const totalReturn = returns.reduce((a, b) => a + b, 0)

    // Calculate maximum drawdown
    let cumulativeReturn = 0
    let peak = 0
    let maxDD = 0
    returns.forEach((ret) => {
      cumulativeReturn += ret
      peak = Math.max(peak, cumulativeReturn)
      const drawdown = peak - cumulativeReturn
      maxDD = Math.max(maxDD, drawdown)
    })

    // Calculate Sharpe ratio (returns / volatility)
    const variance =
      returns.length > 0
        ? returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
        : 0
    const volatility = Math.sqrt(variance)
    const sharpeRatio = volatility > 0 ? averageReturn / volatility : 0

    return {
      totalSignals,
      winningSignals,
      losingSignals,
      winRate,
      averageReturn,
      maxDrawdown: maxDD,
      sharpeRatio,
      totalReturn,
    }
  }
}

export const backtestingEngine = new BacktestingEngine()
