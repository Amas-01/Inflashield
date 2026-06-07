/**
 * InflaShield — home page
 *
 * Server component. Full-scroll storytelling experience with 3D globe,
 * animated sections, and the hedge form mid-scroll.
 */

import HeroSection from '@/components/hero/HeroSection'
import InflationTicker from '@/components/stats/InflationTicker'
import GlobalScaleSection from '@/components/stats/GlobalScaleSection'
import HowItWorksSection from '@/components/how-it-works/HowItWorksSection'
import HedgeFormSection from '@/components/forms/HedgeFormSection'
import TrustSection from '@/components/trust/TrustSection'
import Footer from '@/components/footer/Footer'

export const metadata = {
  title: 'InflaShield — On-chain inflation hedge agent',
  description:
    'Protect your purchasing power anywhere in the world. Automatically score and execute on-chain index hedges against your local currency inflation.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <InflationTicker />
      <GlobalScaleSection />
      <HowItWorksSection />
      <HedgeFormSection />
      <TrustSection />
      <Footer />
    </main>
  )
}
