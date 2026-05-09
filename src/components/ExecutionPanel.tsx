'use client'

/**
 * ExecutionPanel
 *
 * Handles the SoDEX order submission flow.
 * Calls POST /api/execute and shows confirmation or error.
 *
 * TODO: Implement polling for order fill status in Phase 1.
 */

import { useState } from 'react'
import type { HedgeSignal, ExecutionResult } from '@/lib/types'

interface Props {
  signal: HedgeSignal
  onDone: () => void
}

type Step = 'confirm' | 'submitting' | 'done' | 'error'

export default function ExecutionPanel({ signal, onDone }: Props) {
  const [step, setStep] = useState<Step>('confirm')
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleExecute() {
    setStep('submitting')

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? `Execution failed: ${res.status}`)
      }

      const data: ExecutionResult = await res.json()
      setResult(data)
      setStep('done')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Execution failed.')
      setStep('error')
    }
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          This will submit {signal.allocations.length} order(s) to SoDEX testnet.
          No real funds will be moved.
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Confirm and submit
          </button>
          <button
            onClick={onDone}
            className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (step === 'submitting') {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Submitting orders to SoDEX...</p>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-green-800">Orders submitted successfully</p>
        {result.orders.map((order) => (
          <div key={order.orderId} className="text-xs text-green-700">
            <span className="font-medium">{order.indexId}</span>
            {' · '} Order ID: {order.orderId}
            {' · '} Status: {order.status}
            {order.txHash && (
              <span> · Tx: {order.txHash.slice(0, 10)}…</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="space-y-2">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
        <button
          onClick={() => setStep('confirm')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return null
}
