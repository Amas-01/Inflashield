/**
 * WalletProvider — wagmi + RainbowKit setup
 *
 * Provides blockchain wallet connection context to the app.
 * Handles chain configuration, connectors, and wallet display.
 */

'use client'

import { ReactNode } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { arbitrum, polygon, mainnet, sepolia, arbitrumSepolia, polygonMumbai } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'

// ─────────────────────────────────────────────────────────────────────────────
// Chain configuration
// ─────────────────────────────────────────────────────────────────────────────

// Production chains
const productionChains = [mainnet, arbitrum, polygon] as const

// Development/testnet chains
const devChains = [sepolia, arbitrumSepolia, polygonMumbai] as const

// Combine based on environment
const chains = process.env.NODE_ENV === 'production' ? productionChains : [...productionChains, ...devChains]

// ─────────────────────────────────────────────────────────────────────────────
// Wagmi config
// ─────────────────────────────────────────────────────────────────────────────

const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet],
  },
])

const config = createConfig({
  connectors,
  chains: chains as any,
  transports: {
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY || 'demo'}`
    ),
    [arbitrum.id]: http(
      `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY || 'demo'}`
    ),
    [polygon.id]: http(
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY || 'demo'}`
    ),
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY || 'demo'}`
    ),
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [polygonMumbai.id]: http('https://rpc-mumbai.maticvigil.com'),
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// React Query client
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient()

// ─────────────────────────────────────────────────────────────────────────────
// Provider component
// ─────────────────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          appInfo={{
            appName: 'InflaShield',
            appDescription: 'Protect your purchasing power against inflation',
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
