'use client'

/**
 * HedgeForm
 *
 * Collects user input: currency, savings amount, and risk level.
 * Submits to /api/hedge and renders SignalCard on success.
 *
 * TODO: Wire up state and form submission in Phase 1 implementation.
 */

import { useState } from 'react'
import { PRIORITY_CURRENCIES, RISK_LABELS } from '@/config/constants'
import type { HedgeRequest, HedgeSignal, RiskLevel } from '@/lib/types'
import SignalCard from './SignalCard'

export default function HedgeForm() {
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('balanced')
  const [signal, setSignal] = useState<HedgeSignal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSignal(null)

    const request: HedgeRequest = {
      currency,
      amount: Number(amount),
      riskLevel,
    }

    try {
      const res = await fetch('/api/hedge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? `Request failed: ${res.status}`)
      }

      const data: HedgeSignal = await res.json()
      setSignal(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Currency selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your local currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {PRIORITY_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          {/* TODO: Add full currency list from ExchangeRate-API */}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          170+ currencies supported. Your savings will be converted to USD for scoring.
        </p>
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Savings amount ({currency})
        </label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500000"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Risk level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Risk level
        </label>
        <div className="space-y-2">
          {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
            <label
              key={level}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                riskLevel === level
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="riskLevel"
                value={level}
                checked={riskLevel === level}
                onChange={() => setRiskLevel(level)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-gray-800 capitalize">{level}</span>
                <p className="text-xs text-gray-500 mt-0.5">{RISK_LABELS[level]}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !amount || Number(amount) <= 0}
        className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
      >
        {loading ? 'Analysing...' : 'Generate hedge signal'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Signal output */}
      {signal && <SignalCard signal={signal} />}
    </div>
  )
}
