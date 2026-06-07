'use client'

const INFLATION_DATA = [
  { country: 'Turkey', code: 'TRY', rate: '65%', trend: '↑', flag: '🇹🇷' },
  { country: 'Argentina', code: 'ARS', rate: '140%', trend: '↑', flag: '🇦🇷' },
  { country: 'Nigeria', code: 'NGN', rate: '33%', trend: '↑', flag: '🇳🇬' },
  { country: 'Egypt', code: 'EGP', rate: '30%', trend: '↑', flag: '🇪🇬' },
  { country: 'Pakistan', code: 'PKR', rate: '23%', trend: '↑', flag: '🇵🇰' },
  { country: 'Venezuela', code: 'VES', rate: '300%+', trend: '↑', flag: '🇻🇪' },
  { country: 'Ethiopia', code: 'ETB', rate: '28%', trend: '↑', flag: '🇪🇹' },
  { country: 'Sri Lanka', code: 'LKR', rate: '18%', trend: '↑', flag: '🇱🇰' },
]

export default function InflationTicker() {
  // Duplicate the list for seamless loop
  const duplicatedData = [...INFLATION_DATA, ...INFLATION_DATA]

  return (
    <div className="relative w-full bg-void border-y border-border overflow-hidden h-10">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-void to-transparent z-10 pointer-events-none" />
      
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-void to-transparent z-10 pointer-events-none" />

      {/* Marquee */}
      <div
        className="flex items-center h-full animate-marquee hover:pause"
        style={{ width: 'max-content' }}
      >
        {duplicatedData.map((item, index) => (
          <div
            key={`${item.code}-${index}`}
            className="flex items-center gap-3 px-6 whitespace-nowrap"
          >
            <span className="text-lg">{item.flag}</span>
            <span className="font-urbanist text-sm text-text-secondary">
              {item.country}
            </span>
            <span className="font-space-grotesk text-xs text-text-tertiary">
              {item.code}
            </span>
            <span className="font-space-grotesk text-sm text-signal-down font-semibold">
              {item.rate}
            </span>
            <span className="text-signal-down">{item.trend}</span>
            <span className="text-gold-500 text-xs">·</span>
          </div>
        ))}
      </div>
    </div>
  )
}
