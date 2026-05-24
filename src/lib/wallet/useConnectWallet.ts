/**
 * useConnectWallet — Custom hook for wallet connection flow
 *
 * Handles signature-based wallet verification and server-side registration.
 * Returns user's connected wallets and connection status.
 */

'use client'

import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import axios from 'axios'
import type { Wallet } from '@/db/schema/app'

export interface ConnectedWallet extends Wallet {
  id: string
  address: string
  chainId: number
  label: string | null
  createdAt: Date
}

export function useConnectWallet() {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [wallets, setWallets] = useState<ConnectedWallet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's connected wallets from server
  const fetchWallets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/wallet/list')
      if (response.data.success) {
        setWallets(response.data.wallets)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallets')
      console.error('Fetch wallets error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Connect current wallet: sign message → post to server
  const connectWallet = useCallback(
    async (label?: string) => {
      if (!isConnected || !address || !chainId) {
        setError('Please connect a wallet first')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        // Create a message to sign (proof of ownership)
        const timestamp = Date.now()
        const message = `Connect wallet to InflaShield\nAddress: ${address}\nTimestamp: ${timestamp}`

        // Sign the message
        const signature = await signMessageAsync({ message })
        if (!signature) {
          throw new Error('Failed to sign message')
        }

        // Submit to server
        const response = await axios.post('/api/wallet/connect', {
          address,
          chainId,
          label,
          signature,
          timestamp,
        })

        if (response.data.success) {
          setWallets((prev) => [...prev, response.data.wallet])
          return true
        } else {
          throw new Error(response.data.error || 'Failed to connect wallet')
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to connect wallet'
        setError(errMsg)
        console.error('Connect wallet error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [isConnected, address, chainId, signMessageAsync]
  )

  // Disconnect a wallet
  const disconnectWallet = useCallback(async (walletId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post('/api/wallet/disconnect', {
        walletId,
      })

      if (response.data.success) {
        setWallets((prev) => prev.filter((w) => w.id !== walletId))
        return true
      } else {
        throw new Error(response.data.error || 'Failed to disconnect wallet')
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to disconnect wallet'
      setError(errMsg)
      console.error('Disconnect wallet error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if current connected wallet is already registered
  const isCurrentWalletConnected = useCallback(() => {
    if (!address || !chainId) return false
    return wallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase() && w.chainId === chainId
    )
  }, [address, chainId, wallets])

  return {
    // Wagmi state
    isConnected,
    currentAddress: address,
    currentChainId: chainId,

    // Server state
    wallets,
    loading,
    error,

    // Actions
    fetchWallets,
    connectWallet,
    disconnectWallet,
    isCurrentWalletConnected: isCurrentWalletConnected(),
  }
}
