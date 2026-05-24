/**
 * BacktestChart — React component for backtesting results
 *
 * Displays metrics in a card layout with visual indicators.
 */

'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import type { BacktestResult } from '@/lib/engine/backtestingEngine'

export function BacktestChart() {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<string>('')
  const [period, setPeriod] = useState<number>(90) // days

  useEffect(() => {
    loadBacktest()
  }, [])

  const loadBacktest = async (customPeriod?: number, customCurrency?: string) => {
    setLoading(true)
    setError(null)

    try {
      const daysAgo = customPeriod || period
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
      })

      if (customCurrency || currency) {
        params.append('currency', customCurrency || currency)
      }

      const response = await axios.get(`/api/backtest?${params}`)

      if (response.data.success) {
        setResult(response.data.backtest)
      } else {
        throw new Error(response.data.error || 'Failed to load backtest')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backtest')
      console.error('Backtest load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadBacktest = () => {
    loadBacktest(period, currency)
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          {loading ? (
            <p className="text-gray-500">Loading backtest...</p>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : (
            <p className="text-gray-500">No backtest data available</p>
          )}
        </div>
      </div>
    )
  }

  const metrics = result.metrics
  const winRateColor = metrics.winRate > 50 ? 'text-green-600' : 'text-red-600'
  const returnColor = metrics.totalReturn > 0 ? 'text-green-600' : 'text-red-600'
  const sharpeColor = metrics.sharpeRatio > 0.5 ? 'text-green-600' : 'text-yellow-600'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Backtest Results</h2>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period (days)
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="e.g., USD"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleLoadBacktest}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Run Backtest'}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Signals"
            value={metrics.totalSignals.toString()}
            subtitle={`${metrics.winningSignals} wins, ${metrics.losingSignals} losses`}
          />

          <MetricCard
            title="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
            color={winRateColor}
            subtitle={`Strategy profitability`}
          />

          <MetricCard
            title="Total Return"
            value={`${metrics.totalReturn.toFixed(2)}%`}
            color={returnColor}
            subtitle={`Average: ${metrics.averageReturn.toFixed(2)}%`}
          />

          <MetricCard
            title="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            color={sharpeColor}
            subtitle={`Risk-adjusted returns`}
          />

          <MetricCard
            title="Max Drawdown"
            value={`${metrics.maxDrawdown.toFixed(2)}%`}
            subtitle={`Worst peak-to-trough decline`}
          />
        </div>

        {/* Signals List */}
        {result.signals.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recent Signals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Risk Level</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {result.signals.slice(0, 5).map((signal) => (
                    <tr key={signal.id} className="border-t">
                      <td className="px-4 py-2">
                        {new Date(signal.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">${signal.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {signal.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            signal.status === 'executed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {signal.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={
                            signal.return && signal.return > 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {signal.return ? `${signal.return.toFixed(2)}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  color?: string
}

function MetricCard({ title, value, subtitle, color }: MetricCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold mb-1 ${color || 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}
