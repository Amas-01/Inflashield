'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    number: '01',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: 'Enter your currency and savings',
    description:
      'Tell us which currency you hold and how much you want to protect. We support 150+ world currencies.',
  },
  {
    number: '02',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: 'We score on-chain indices for your inflation rate',
    description:
      'Our engine analyzes SoSoValue indices based on inflation hedge strength, risk-adjusted returns, and liquidity.',
  },
  {
    number: '03',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: 'Execute the hedge on SoDEX with one click',
    description:
      'Review the allocation, connect your wallet, and execute on-chain. Your hedge is live in seconds.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-surface-1 relative">
      {/* Decorative line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-syne text-4xl lg:text-5xl text-white text-center mb-20 font-bold"
        >
          Signal-to-execution in 60 seconds
        </motion.h2>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connecting lines on desktop */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-[2px]">
            <div className="max-w-5xl mx-auto h-full border-t-2 border-dashed border-gold-500/30" />
          </div>

          {STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{
                opacity: 0,
                x: index === 0 ? -60 : index === 2 ? 60 : 0,
                y: index === 1 ? 40 : 0,
              }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="glass rounded-2xl p-8 relative"
            >
              {/* Ghost number */}
              <div className="absolute top-0 right-4 font-space-grotesk text-[120px] font-bold opacity-[0.05] leading-none select-none pointer-events-none">
                {step.number}
              </div>

              {/* Icon */}
              <div className="relative z-10 mb-6 text-gold-400">{step.icon}</div>

              {/* Content */}
              <h3 className="relative z-10 font-syne text-xl text-white font-semibold mb-3">
                {step.title}
              </h3>
              <p className="relative z-10 font-urbanist text-text-secondary text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
