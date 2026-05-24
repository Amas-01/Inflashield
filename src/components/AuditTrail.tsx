/**
 * AuditTrail — User action history (readonly)
 *
 * Displays immutable audit log of:
 * - Authentication events
 * - Portfolio changes
 * - Orders executed
 * - Settings modifications
 */

'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface AuditEntry {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  outcome: 'success' | 'failure'
  metadata?: Record<string, any>
  serverTimestamp: string
}

export function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadAuditTrail()
  }, [filter])

  const loadAuditTrail = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('action', filter)
      }

      const response = await axios.get(`/api/audit?${params}`)

      if (response.data.success) {
        setEntries(response.data.entries || [])
      } else {
        throw new Error(response.data.error || 'Failed to load audit trail')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail')
      console.error('Audit trail load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading audit trail...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>
  }

  const filters = ['all', 'auth', 'wallet', 'portfolio', 'orders', 'settings']

  return (
    <div className="p-6 space-y-6">
      {/* Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Audit Log */}
      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No audit entries found</div>
      )}
    </div>
  )
}

interface AuditEntryProps {
  entry: AuditEntry
}

function AuditEntry({ entry }: AuditEntryProps) {
  const getIcon = (action: string) => {
    if (action.includes('auth')) return '🔐'
    if (action.includes('wallet')) return '🔗'
    if (action.includes('order')) return '📦'
    if (action.includes('rebalance')) return '🔄'
    if (action.includes('settings')) return '⚙️'
    return '📌'
  }

  const getColor = (outcome: string) => {
    return outcome === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700'
  }

  return (
    <div className={`rounded-lg border p-4 ${getColor(entry.outcome)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-2xl">{getIcon(entry.action)}</span>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="font-semibold capitalize">{entry.action.replace(/[._]/g, ' ')}</p>
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${
                  entry.outcome === 'success'
                    ? 'bg-green-200 text-green-900'
                    : 'bg-red-200 text-red-900'
                }`}
              >
                {entry.outcome}
              </span>
            </div>
            <p className="text-sm opacity-75">
              On <span className="font-mono">{entry.resourceType}</span>
              {entry.resourceId && (
                <>
                  {' '}
                  <span className="font-mono">{entry.resourceId.slice(0, 8)}...</span>
                </>
              )}
            </p>
            <p className="text-xs opacity-60 mt-1">
              {new Date(entry.serverTimestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="mt-3 ml-11 text-xs opacity-75 space-y-1">
          {Object.entries(entry.metadata).map(([key, value]) => (
            <p key={key}>
              <span className="font-mono">{key}:</span>{' '}
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
