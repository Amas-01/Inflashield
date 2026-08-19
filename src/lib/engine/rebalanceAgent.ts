/**
 * RebalanceAgent — Weekly portfolio rebalancing logic
 *
 * Checks portfolio drift, executes rebalancing orders,
 * and sends notifications to users.
 */

import { HedgeSignalRepository } from '@/db/repositories/HedgeSignalRepository'
import { OrderRepository } from '@/db/repositories/OrderRepository'
import { WalletRepository } from '@/db/repositories/WalletRepository'
import { UserRepository } from '@/db/repositories/UserRepository'
import { writeAudit } from '@/lib/audit/logger'
import { telegramService } from '@/lib/notifications/telegram'
import axios from 'axios'

export interface RebalanceResult {
  userId: string
  currency: string
  oldAllocation: number
  newAllocation: number
  drift: number
  executed: boolean
  error?: string
}

export class RebalanceAgent {
  /**
   * Calculate portfolio drift for a user's signals
   * Drift = |target_allocation - actual_allocation| / target_allocation
   */
  private calculateDrift(targetAllocation: number, actualValue: number): number {
    if (targetAllocation === 0) return 0
    return Math.abs((actualValue - targetAllocation) / targetAllocation) * 100
  }

  /**
   * Execute rebalance for a specific user
   */
  async rebalanceUser(userId: string): Promise<RebalanceResult[]> {
    const results: RebalanceResult[] = []

    try {
      // Get user's hedge signals
      const signalRepo = new HedgeSignalRepository(userId)
      const signals = await signalRepo.findRecent(100)

      if (!signals || signals.length === 0) {
        console.log(`No signals found for user ${userId}`)
        return results
      }

      // Get user's orders to calculate actual allocations
      const orderRepo = new OrderRepository(userId)
      const orders = await orderRepo.findRecent(100)

      // Group signals by currency
      const signalsByCurrency: Record<string, any[]> = {}
      signals.forEach((signal) => {
        if (!signalsByCurrency[signal.currency]) {
          signalsByCurrency[signal.currency] = []
        }
        signalsByCurrency[signal.currency].push(signal)
      })

      // Calculate allocations per currency
      for (const [currency, currencySignals] of Object.entries(signalsByCurrency)) {
        const targetAllocation = currencySignals.reduce((sum, s) => sum + parseFloat(s.amountUsd), 0)

        // Get actual allocation from recent orders
        const currencyOrders = orders?.filter((o) => {
          const signal = signals.find((s) => s.id === o.signalId)
          return signal?.currency === currency
        }) || []

        const actualAllocation = currencyOrders.reduce((sum, o) => sum + parseFloat(o.amountUsd), 0)

        // Calculate drift
        const drift = this.calculateDrift(targetAllocation, actualAllocation)

        // Rebalance if drift exceeds threshold (e.g., 5%)
        const REBALANCE_THRESHOLD = 5

        if (drift > REBALANCE_THRESHOLD) {
          const result = await this.executeRebalance({
            userId,
            currency,
            targetAllocation,
            actualAllocation,
            drift,
            signals: currencySignals,
          })
          results.push(result)
        }
      }

      // Log audit trail
      if (results.length > 0) {
        await writeAudit({
      resource_id: null,user_id: 'guest',
          userId,
          sessionId: null,
          action: 'rebalance.completed',
          resourceType: 'portfolio',
          outcome: 'success',
          metadata: {
            rebalancedCurrencies: results.map((r) => r.currency),
            totalDrift: results.reduce((sum, r) => sum + r.drift, 0) / results.length,},
        })
      }

      return results
    } catch (error) {
      console.error('RebalanceAgent.rebalanceUser error:', error)

      await writeAudit({
      resource_id: null,user_id: 'guest',
        userId,
        sessionId: null,
        action: 'rebalance.error',
        resourceType: 'portfolio',
        outcome: 'failure',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',},
      })

      return results
    }
  }

  /**
   * Execute a single rebalancing order
   */
  private async executeRebalance(params: {
    userId: string
    currency: string
    targetAllocation: number
    actualAllocation: number
    drift: number
    signals: any[]
  }): Promise<RebalanceResult> {
    const result: RebalanceResult = {
      userId: params.userId,
      currency: params.currency,
      oldAllocation: params.actualAllocation,
      newAllocation: params.targetAllocation,
      drift: params.drift,
      executed: false,
    }

    try {
      // Get user's wallet
      const walletRepo = new WalletRepository(params.userId)
      const wallets = await walletRepo.findAll()

      if (!wallets || wallets.length === 0) {
        throw new Error('No wallet connected')
      }

      // Get primary wallet (first connected wallet)
      const primaryWallet = wallets[0]

      // Call SoDEX API to create rebalancing order
      const orderData = {
        walletAddress: primaryWallet.address,
        currency: params.currency,
        amount: params.targetAllocation - params.actualAllocation,
        type: 'rebalance',
        indexId: 'inflation', // TODO: determine from signal data
      }

      // This would call the real SoDEX API in production
      // For now, simulate successful order creation
      const orderCreated = await this.createSoDEXOrder(orderData)

      if (orderCreated) {
        result.executed = true

        // Record order in database
        const orderRepo = new OrderRepository(params.userId)
        await orderRepo.create({
          signalId: params.signals[0].id,
          sodexOrderId: orderCreated.id,
          indexId: orderData.indexId,
          amountUsd: orderData.amount.toString(),
          status: 'pending',
          network: process.env.SODEX_ENV || 'testnet',
        })

        // Send Telegram notification if user opted in
        const userRepo = new UserRepository()
        const user = await userRepo.findById(params.userId)
        if (user) {
          // TODO: Fetch notification preferences and send notification
        }
      }
    } catch (error) {
      result.executed = false
      result.error = error instanceof Error ? error.message : 'Unknown error'
      console.error('RebalanceAgent.executeRebalance error:', error)
    }

    return result
  }

  /**
   * Simulate/call SoDEX API to create order
   * In production, this would call the real SoDEX API
   */
  private async createSoDEXOrder(orderData: any): Promise<{ id: string } | null> {
    try {
      // Simulate API call
      console.log('Creating SoDEX order:', orderData)
      return {
        id: `order_${Date.now()}`,
      }
    } catch {
      return null
    }
  }

  /**
   * Run rebalance for all users (called by scheduler)
   */
  async rebalanceAll(): Promise<void> {
    console.log('🔄 Starting weekly rebalance...')

    try {
      // TODO: Fetch all active users from database
      // For now, this is a skeleton that would be triggered by a background job

      const startTime = Date.now()

      // TODO: Iterate through users and call rebalanceUser()

      const duration = Date.now() - startTime
      console.log(`✅ Rebalance completed in ${duration}ms`)
    } catch (error) {
      console.error('RebalanceAgent.rebalanceAll error:', error)
    }
  }
}

export const rebalanceAgent = new RebalanceAgent()
