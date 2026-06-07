'use client'

/**
 * SignalCard — Redesigned with futuristic dark UI
 *
 * Displays the hedge recommendation produced by the engine.
 * Shows: allocation breakdown, index scores, rationale, and Execute button.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { HedgeSignal } from '@/lib/types'
import ExecutionPanel from './ExecutionPanel'
import GoldButton from './ui/GoldButton'

interface Props {
  signal: HedgeSignal
}

export default function SignalCard({ signal }: Props) {
  const [executing, setExecuting] = useState(false)
  const [showFullRationale, setShowFullRationale] = useState(false)

  // Calculate overall signal strength (0-100)
  const topScore = signal.indexScores[0]?.overallScore || 75

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass border border-border rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Gold top border */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

      {/* Header */}
      <div className="bg-surface-1 px-6 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.15em] mb-2">
              HEDGE SIGNAL
            </p>
            <p className="font-space-grotesk text-3xl text-white font-bold mb-1">
              ${signal.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="font-urbanist text-sm text-text-secondary">
              {signal.amountUsd.toLocaleString()} {signal.currency} · {signal.riskLevel} risk
            </p>
          </div>

          {/* Circular gauge showing signal strength */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="var(--color-surface-3)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="var(--color-gold-500)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${(topScore / 100) * 201} 201`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-space-grotesk text-sm text-gold-400 font-bold">
                {topScore}
              </span>
              <span className="font-urbanist text-[9px] text-text-tertiary uppercase">Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocations */}
      <div className="px-6 py-5">
        <p className="font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.15em] mb-4">
          ALLOCATION
        </p>
        <div className="space-y-4">
          {signal.allocations.map((alloc, index) => (
            <div key={alloc.indexId} className="pb-4 border-b border-border/50 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-urbanist font-medium text-text-primary text-sm">
                    {alloc.indexName}
                  </p>
                  <p className="font-space-grotesk text-xs text-text-tertiary">
                    {alloc.indexSymbol}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-space-grotesk font-bold text-lg text-white">
                    {Math.round(alloc.weight * 100)}%
                  </p>
                  <p className="font-space-grotesk text-xs text-text-tertiary">
                    ${alloc.amountUsd.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Animated progress bar */}
              <div className="h-[3px] bg-surface-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${alloc.weight * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-gold-500 to-signal-up rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown (top index) */}
      {signal.indexScores.length > 0 && (
        <div className="px-6 py-5 bg-surface-1/50 border-t border-border/50">
          <p className="font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.15em] mb-4">
            WHY THIS INDEX
          </p>
          {(['inflationCorrelation', 'riskAdjustedReturn', 'liquidityScore'] as const).map((dim) => {
            const top = signal.indexScores[0]
            const labels = {
              inflationCorrelation: 'Inflation hedge',
              riskAdjustedReturn: 'Risk-adjusted return',
              liquidityScore: 'Liquidity',
            }
            const colors = {
              inflationCorrelation: 'bg-gold-500',
              riskAdjustedReturn: 'bg-signal-up',
              liquidityScore: 'bg-data-400',
            }
            return (
              <div key={dim} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="font-urbanist text-xs text-text-tertiary w-32">
                  {labels[dim]}
                </span>
                <div className="flex-1 h-[3px] bg-surface-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top[dim]}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${colors[dim]} rounded-full`}
                  />
                </div>
                <span className="font-space-grotesk text-xs text-text-secondary w-10 text-right">
                  {top[dim]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Rationale */}
      <div className="px-6 py-5 border-t border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <p className="font-urbanist text-xs font-semibold text-gold-400 uppercase tracking-[0.15em]">
            SIGNAL RATIONALE
          </p>
          {signal.rationaleIsAiGenerated ? (
            <span className="bg-purple-900/40 border border-purple-700/50 text-purple-300 font-space-grotesk text-xs px-2 py-0.5 rounded">
              ✦ AI
            </span>
          ) : (
            <span className="bg-surface-2 border border-border text-text-tertiary font-space-grotesk text-xs px-2 py-0.5 rounded">
              AUTO
            </span>
          )}
        </div>
        
        <motion.div
          animate={{ height: showFullRationale ? 'auto' : '60px' }}
          className="overflow-hidden relative"
        >
          <p className="font-urbanist text-sm text-text-secondary leading-relaxed">
            {signal.rationale}
          </p>
          {!showFullRationale && signal.rationale.length > 150 && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-1 to-transparent" />
          )}
        </motion.div>
        
        {signal.rationale.length > 150 && (
          <button
            onClick={() => setShowFullRationale(!showFullRationale)}
            className="font-urbanist text-xs text-gold-400 hover:text-gold-300 mt-2 transition-colors"
          >
            {showFullRationale ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Execute */}
      <div className="px-6 py-5 border-t border-border/50">
        {executing ? (
          <ExecutionPanel signal={signal} onDone={() => setExecuting(false)} />
        ) : (
          <>
            <GoldButton
              onClick={() => setExecuting(true)}
              size="lg"
              className="w-full"
            >
              Execute on SoDEX
              <span className="ml-2">→</span>
            </GoldButton>
            <p className="text-center font-urbanist text-xs text-text-tertiary mt-3">
              Testnet only — no real funds are moved
            </p>
          </>
        )}
      </div>
    </motion.div>
  )
}
