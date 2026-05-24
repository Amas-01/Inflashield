/**
 * Dashboard — Main user interface
 *
 * Shows overview of:
 * - Portfolio summary
 * - Recent orders
 * - Audit trail
 * - Quick actions
 */

'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { PortfolioSummary } from './PortfolioSummary'
import { AuditTrail } from './AuditTrail'
import { NotificationSettings } from './NotificationSettings'

export function Dashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'audit' | 'settings'>('portfolio')
  const [loading, setLoading] = useState(false)

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please log in to access the dashboard</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">
            Welcome back, <span className="font-semibold">{session.user.email}</span>
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-700 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'portfolio'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-600'
            }`}
          >
            📊 Portfolio
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'
            }`}
          >
            📋 Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-600'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg">
          {activeTab === 'portfolio' && <PortfolioSummary />}
          {activeTab === 'audit' && <AuditTrail />}
          {activeTab === 'settings' && <NotificationSettings />}
        </div>
      </div>
    </div>
  )
}
