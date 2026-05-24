/**
 * NotificationSettings — Notification preferences UI
 *
 * Allows users to:
 * - Configure Telegram chat ID
 * - Set rebalance notifications
 * - Adjust alert thresholds
 */

'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export function NotificationSettings() {
  const [telegramChatId, setTelegramChatId] = useState('')
  const [notifyOnRebalance, setNotifyOnRebalance] = useState(true)
  const [notifyThresholdPct, setNotifyThresholdPct] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get('/api/notifications/preferences')

      if (response.data.success) {
        const prefs = response.data.preferences
        setTelegramChatId(prefs.telegramChatId || '')
        setNotifyOnRebalance(prefs.notifyOnRebalance)
        setNotifyThresholdPct(prefs.notifyThresholdPct)
      } else {
        throw new Error(response.data.error || 'Failed to load preferences')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
      console.error('Load preferences error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await axios.patch('/api/notifications/preferences', {
        telegramChatId: telegramChatId || null,
        notifyOnRebalance,
        notifyThresholdPct,
      })

      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        throw new Error(response.data.error || 'Failed to save preferences')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
      console.error('Save preferences error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading settings...</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold">Notification Settings</h3>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          ✓ Settings saved successfully!
        </div>
      )}

      {/* Telegram Configuration */}
      <div className="space-y-3">
        <label className="block">
          <span className="font-semibold text-gray-900 mb-2 block">Telegram Bot Token</span>
          <p className="text-sm text-gray-600 mb-2">
            Get your chat ID from{' '}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @userinfobot
            </a>
          </p>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="Enter your Telegram chat ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your chat ID is kept private and only used to send you notifications.
          </p>
        </label>
      </div>

      {/* Rebalance Notifications */}
      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notifyOnRebalance}
            onChange={(e) => setNotifyOnRebalance(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="font-semibold text-gray-900">Notify on rebalancing</span>
        </label>
        <p className="text-sm text-gray-600 ml-7">
          Receive a Telegram notification when your portfolio is automatically rebalanced.
        </p>
      </div>

      {/* Notification Threshold */}
      <div className="space-y-3">
        <label className="block">
          <span className="font-semibold text-gray-900 mb-2 block">
            Alert Threshold: {notifyThresholdPct.toFixed(1)}%
          </span>
          <p className="text-sm text-gray-600 mb-3">
            Rebalance when portfolio drift exceeds this percentage
          </p>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={notifyThresholdPct}
            onChange={(e) => setNotifyThresholdPct(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>10%</span>
            <span>20%</span>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={loadPreferences}
          disabled={loading || saving}
          className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium"
        >
          Reset
        </button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Enable Telegram notifications to stay informed about your hedge portfolio
          activity. You'll receive updates on rebalancing events and important alerts.
        </p>
      </div>
    </div>
  )
}
