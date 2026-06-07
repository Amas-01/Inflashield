'use client'

import { motion } from 'framer-motion'

const API_PARTNERS = [
  {
    name: 'SoSoValue',
    description: 'SSI index data',
    url: 'https://sosovalue.com',
  },
  {
    name: 'SoDEX',
    description: 'On-chain execution',
    url: 'https://sodex.com',
  },
  {
    name: 'ExchangeRate-API',
    description: 'Live FX rates',
    url: 'https://exchangerate-api.com',
  },
]

const SECURITY_SIGNALS = [
  {
    icon: '🔒',
    text: 'Testnet by default — no real funds in Phase 1',
  },
  {
    icon: '🛡',
    text: 'Server-side only API keys — never exposed to browser',
  },
  {
    icon: '📋',
    text: 'Complete audit trail — every action logged',
  },
]

export default function TrustSection() {
  return (
    <section className="py-24 lg:py-32 bg-void relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-syne text-2xl lg:text-3xl text-white text-center mb-12 font-bold"
        >
          Built on trusted infrastructure
        </motion.h2>

        {/* API Partners */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {API_PARTNERS.map((partner, index) => (
            <motion.a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              data-cursor="expand"
              className="glass rounded-xl p-6 text-center hover:border-gold-500/50 transition-all duration-200"
            >
              <h3 className="font-syne text-xl text-white font-semibold mb-2">
                {partner.name}
              </h3>
              <p className="font-urbanist text-sm text-text-secondary">
                {partner.description}
              </p>
            </motion.a>
          ))}
        </div>

        {/* Security Signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12"
        >
          {SECURITY_SIGNALS.map((signal, index) => (
            <div key={index} className="flex items-center gap-3 text-center md:text-left">
              <span className="text-2xl flex-shrink-0">{signal.icon}</span>
              <span className="font-urbanist text-sm text-text-tertiary max-w-[200px]">
                {signal.text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
