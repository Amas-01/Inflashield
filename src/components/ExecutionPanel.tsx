'use client'

/**
 * ExecutionPanel
 *
 * Handles the SoDEX order submission flow.
 * States: confirm → submitting → done/error
 *
 * Confirmation screen shows a warning listing all orders to be submitted.
 * Submitting screen shows spinner.
 * Done screen shows each order's status.
 * Error screen shows friendly message with retry button.
 */

import { useState } from 'react'
import type { HedgeSignal, OrderResponse } from '@/lib/types'

interface Props {
  signal: HedgeSignal
  onDone: () => void
}

interface ExecutionError {
  indexId: string
  error: string
}

type Step = 'confirm' | 'submitting' | 'done' | 'error'

export default function ExecutionPanel({ signal, onDone }: Props) {
  const [step, setStep] = useState<Step>('confirm')
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [errors, setErrors] = useState<ExecutionError[]>([])
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

      const data = await res.json()
      setOrders(data.orders || [])
      setErrors(data.errors || [])
      setStep('done')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Execution failed.')
      setStep('error')
    }
  }

  // Confirmation step
  if (step === 'confirm') {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 space-y-2">
          <p className="font-medium">⚠️ Review before submitting</p>
          <p>The following orders will be submitted to SoDEX testnet:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {signal.allocations.map((alloc) => (
              <li key={alloc.indexId} className="text-xs">
                <strong>{alloc.indexName}</strong> — ${alloc.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2 italic">No real funds are at risk — this is testnet only.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Continue to execution
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

  // Submitting step
  if (step === 'submitting') {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="inline-block animate-spin">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 font-medium">Submitting orders to SoDEX testnet…</p>
        <p className="text-xs text-gray-400">Please don&apos;t close this window</p>
      </div>
    )
  }

  // Done step
  if (step === 'done') {
    const hasErrors = errors.length > 0
    return (
      <div className="space-y-3">
        {orders.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 space-y-2">
            <p className="text-sm font-medium text-green-800">
              ✓ {orders.length} order{orders.length !== 1 ? 's' : ''} submitted successfully
            </p>
            {orders.map((order) => (
              <div key={order.orderId} className="text-xs text-green-700 bg-white/50 rounded px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.indexId}</p>
                    <p className="text-green-600">ID: {order.orderId.slice(0, 12)}…</p>
                    <p className="text-green-600">Status: <span className="capitalize">{order.status}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.amountUsd.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 italic mt-2">This is a testnet order. No real funds were moved.</p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-red-800">
              ✗ {errors.length} order{errors.length !== 1 ? 's' : ''} failed
            </p>
            {errors.map((error) => (
              <div key={error.indexId} className="text-xs text-red-700 bg-white/50 rounded px-2 py-1.5">
                <p className="font-medium">{error.indexId}: {error.error}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onDone}
          className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {hasErrors ? 'Back to form' : 'Done'}
        </button>
      </div>
    )
  }

  // Error step
  if (step === 'error') {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <p className="font-medium mb-1">Unable to submit orders</p>
          <p className="text-xs">{errorMessage}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('confirm')}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Try again
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

  return null
}
