export default function Footer() {
  return (
    <>
      {/* Gradient fade */}
      <div className="h-24 bg-gradient-to-b from-transparent to-void pointer-events-none" />

      <footer className="bg-void border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Left: Logo and tagline */}
            <div>
              <h3 className="font-syne text-lg text-white font-bold mb-2">InflaShield</h3>
              <p className="font-urbanist text-sm text-text-tertiary">
                On-chain inflation hedge, for everyone.
              </p>
            </div>

            {/* Center: Links */}
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-urbanist text-sm text-text-secondary hover:text-gold-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="/docs"
                className="font-urbanist text-sm text-text-secondary hover:text-gold-400 transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-urbanist text-sm text-text-secondary hover:text-gold-400 transition-colors"
              >
                Discord
              </a>
            </div>

            {/* Right: Buildathon credit */}
            <div className="text-right">
              <p className="font-urbanist text-sm text-text-tertiary">
                Built for SoSoValue Buildathon 2025
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-urbanist text-sm text-text-tertiary">
              © {new Date().getFullYear()} InflaShield · MIT License
            </p>
            <p className="font-urbanist text-sm text-signal-warn">
              Testnet only — no real funds
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
