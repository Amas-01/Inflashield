'use client'

/**
 * SignalCard
 *
 * Displays the hedge recommendation produced by the engine.
 * Shows: allocation breakdown, index scores, rationale, and Execute button.
 *
 * TODO: ExecutionPanel integration in Phase 1 implementation.
 */

import { useState } from 'react'
import type { HedgeSignal } from '@/lib/types'
import ExecutionPanel from './ExecutionPanel'

interface Props {
  signal: HedgeSignal
}

export default function SignalCard({ signal }: Props) {
  const [executing, setExecuting] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Hedge signal</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              ${signal.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
            </p>
            <p className="text-xs text-gray-400">
              from {signal.amountUsd.toLocaleString()} {signal.currency} · {signal.riskLevel} risk
            </p>
          </div>
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
            {signal.allocations.length} {signal.allocations.length === 1 ? 'index' : 'indices'}
          </span>
        </div>
      </div>

      {/* Allocations */}
      <div className="px-5 py-4 space-y-3">
        {signal.allocations.map((alloc) => (
          <div key={alloc.indexId} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{alloc.indexName}</p>
              <p className="text-xs text-gray-400">{alloc.indexSymbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {Math.round(alloc.weight * 100)}%
              </p>
              <p className="text-xs text-gray-400">
                ${alloc.amountUsd.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Score breakdown (top index) */}
      {signal.indexScores.length > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Top index score breakdown</p>
          {(['inflationCorrelation', 'riskAdjustedReturn', 'liquidityScore'] as const).map((dim) => {
            const top = signal.indexScores[0]
            const labels = {
              inflationCorrelation: 'Inflation hedge',
              riskAdjustedReturn: 'Risk-adjusted return',
              liquidityScore: 'Liquidity',
            }
            return (
              <div key={dim} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-400 w-36">{labels[dim]}</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${top[dim]}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{top[dim]}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Rationale */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-1">
          Why this allocation
          {signal.rationaleIsAiGenerated && (
            <span className="ml-2 text-purple-500">· AI-generated</span>
          )}
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">{signal.rationale}</p>
      </div>

      {/* Execute */}
      <div className="px-5 py-4 border-t border-gray-100">
        {executing ? (
          <ExecutionPanel signal={signal} onDone={() => setExecuting(false)} />
        ) : (
          <button
            onClick={() => setExecuting(true)}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Execute on SoDEX testnet
          </button>
        )}
        <p className="text-center text-xs text-gray-400 mt-2">
          Testnet only — no real funds are moved
        </p>
      </div>
    </div>
  )
}
