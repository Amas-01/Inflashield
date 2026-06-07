import { Urbanist, Space_Grotesk, Syne } from 'next/font/google'
import SmoothScrollProvider from '@/providers/SmoothScrollProvider'
import CursorProvider from '@/providers/CursorProvider'
import './globals.css'

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
  adjustFontFallback: true,
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
})

export const metadata = {
  title: 'InflaShield — On-chain inflation hedge agent',
  description: 'Protect your purchasing power anywhere in the world. Automatically score and execute on-chain index hedges against your local currency inflation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${urbanist.variable} ${spaceGrotesk.variable} ${syne.variable}`}>
      <body className="font-urbanist bg-deep text-text-primary antialiased">
        <SmoothScrollProvider>
          <CursorProvider>
            {/* Global noise overlay */}
            <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.025] noise" />
            {children}
          </CursorProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  )
}
