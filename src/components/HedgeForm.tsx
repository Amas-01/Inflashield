'use client'

/**
 * HedgeForm — Visual redesign with futuristic dark UI
 *
 * Collects user input: currency, savings amount, and risk level.
 * Submits to /api/hedge and renders SignalCard on success.
 */

import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { PRIORITY_CURRENCIES, RISK_LABELS } from '@/config/constants'
import type { HedgeRequest, HedgeSignal, RiskLevel } from '@/lib/types'
import SignalCard from './SignalCard'
import GoldButton from './ui/GoldButton'

const RISK_ICONS: Record<RiskLevel, JSX.Element> = {
  conservative: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  balanced: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  aggressive: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
}

const RISK_COLORS: Record<RiskLevel, string> = {
  conservative: 'text-data-400',
  balanced: 'text-gold-400',
  aggressive: 'text-signal-up',
}

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
    <div className="space-y-8">
      {/* Main form card */}
      <div className="glass-gold rounded-2xl overflow-hidden shadow-2xl p-8">
        <div className="space-y-6">
          {/* Currency selector */}
          <div>
            <label className="block font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.12em] mb-3">
              Your local currency
            </label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl h-12 px-4 font-space-grotesk text-text-primary text-sm appearance-none cursor-pointer transition-all duration-200 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                data-cursor="expand"
              >
                {PRIORITY_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="font-urbanist text-xs text-text-tertiary mt-2">
              170+ currencies supported. Your savings will be converted to USD for scoring.
            </p>
          </div>

          {/* Amount input */}
          <div className="relative">
            <label className="block font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.12em] mb-3">
              Savings amount
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full bg-surface-2 border border-border rounded-xl h-12 px-4 pr-16 font-space-grotesk text-text-primary transition-all duration-200 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              />
              {/* Currency code inside input */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-space-grotesk text-sm text-text-tertiary pointer-events-none">
                {currency}
              </div>
            </div>
          </div>

          {/* Risk level selector */}
          <div>
            <label className="block font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.12em] mb-3">
              Risk level
            </label>
            <LayoutGroup>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
                  <motion.button
                    key={level}
                    type="button"
                    onClick={() => setRiskLevel(level)}
                    data-cursor="expand"
                    className={`
                      relative h-28 rounded-xl cursor-pointer
                      flex flex-col items-center justify-center gap-2
                      transition-all duration-200
                      ${
                        riskLevel === level
                          ? 'glass-gold glow-gold scale-[1.02]'
                          : 'glass hover:border-border-glow'
                      }
                    `}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={RISK_COLORS[level]}>{RISK_ICONS[level]}</div>
                    <span className="font-urbanist font-semibold text-sm text-text-primary capitalize">
                      {level}
                    </span>
                    <span className="font-urbanist text-xs text-text-tertiary px-2 text-center">
                      {RISK_LABELS[level]}
                    </span>
                    {riskLevel === level && (
                      <motion.div
                        layoutId="risk-selector-dot"
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold-500"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>
          </div>

          {/* Submit button */}
          <GoldButton
            onClick={handleSubmit}
            disabled={loading || !amount || Number(amount) <= 0}
            loading={loading}
            size="lg"
            type="button"
            className="w-full"
          >
            {loading ? 'Analysing markets...' : 'Generate Hedge Signal'}
          </GoldButton>
        </div>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-urbanist text-sm text-red-300">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal output */}
      {signal && <SignalCard signal={signal} />}
    </div>
  )
}
