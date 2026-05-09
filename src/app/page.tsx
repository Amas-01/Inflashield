/**
 * InflaShield — home page
 *
 * Server component. Renders the HedgeForm which collects user input.
 * Actual hedge computation happens via POST /api/hedge (see src/app/api/hedge/route.ts).
 */

import HedgeForm from '@/components/HedgeForm'

export const metadata = {
  title: 'InflaShield — On-chain inflation hedge agent',
  description:
    'Protect your purchasing power anywhere in the world. Automatically score and execute on-chain index hedges against your local currency inflation.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            InflaShield
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
            On-chain inflation hedge agent. Enter your currency and savings amount
            to receive a scored allocation recommendation and execute it on SoDEX.
          </p>
        </div>

        {/* Main form — client component */}
        <HedgeForm />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Built on{' '}
          <a href="https://sosovalue.com" className="underline">SoSoValue</a>
          {' '}·{' '}
          <a href="https://sodex.com" className="underline">SoDEX</a>
          {' '}· Testnet only — no real funds at risk
        </p>
      </div>
    </main>
  )
}
