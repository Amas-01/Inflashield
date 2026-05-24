/**
 * PortfolioSummary — Active positions and recent orders
 *
 * Displays:
 * - Connected wallets
 * - Recent hedge signals
 * - Pending orders
 */

'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Wallet {
  id: string
  address: string
  chainId: number
  label: string | null
}

interface HedgeSignal {
  id: string
  currency: string
  amountUsd: number
  riskLevel: string
  createdAt: string
}

export function PortfolioSummary() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [signals, setSignals] = useState<HedgeSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [walletsRes, signalsRes] = await Promise.all([
        axios.get('/api/wallet/list'),
        axios.get('/api/hedge'), // Assuming hedge endpoint returns signals
      ])

      if (walletsRes.data.success) {
        setWallets(walletsRes.data.wallets || [])
      }

      if (signalsRes.data.success) {
        setSignals(signalsRes.data.signals || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio')
      console.error('Portfolio load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading portfolio...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>
  }

  const totalAllocation = signals.reduce((sum, s) => sum + s.amountUsd, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Connected Wallets" value={wallets.length.toString()} icon="🔗" />
        <SummaryCard title="Total Allocation" value={`$${totalAllocation.toFixed(2)}`} icon="💰" />
        <SummaryCard title="Active Signals" value={signals.length.toString()} icon="📡" />
      </div>

      {/* Connected Wallets */}
      {wallets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Connected Wallets</h3>
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <p className="font-mono text-sm">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </p>
                  {wallet.label && <p className="text-xs text-gray-500">{wallet.label}</p>}
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Chain {wallet.chainId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Signals */}
      {signals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Signals</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Currency</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Risk Level</th>
                  <th className="px-4 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 5).map((signal) => (
                  <tr key={signal.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{signal.currency}</td>
                    <td className="px-4 py-2">${signal.amountUsd.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          signal.riskLevel === 'conservative'
                            ? 'bg-green-100 text-green-800'
                            : signal.riskLevel === 'balanced'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {signal.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(signal.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {signals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No signals yet. Create your first hedge signal to get started!</p>
          <a href="/hedge" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Create Signal
          </a>
        </div>
      )}
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  icon: string
}

function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
