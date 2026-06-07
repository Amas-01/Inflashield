'use client'

import { motion } from 'framer-motion'
import HedgeForm from '../HedgeForm'

export default function HedgeFormSection() {
  return (
    <section
      id="hedge-form"
      className="py-24 lg:py-32 bg-surface-1 relative overflow-hidden"
    >
      {/* Radial gold glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245, 200, 66, 0.03) 0%, transparent 60%)',
        }}
      />

      {/* Atmospheric text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="font-syne text-[20vw] font-bold opacity-[0.03] select-none whitespace-nowrap">
          HEDGE
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-syne text-3xl lg:text-4xl text-white font-bold mb-3">
            Protect your savings
          </h2>
          <p className="font-urbanist text-sm text-text-tertiary">
            Powered by SoSoValue SSI indices and SoDEX execution
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <HedgeForm />
        </motion.div>
      </div>
    </section>
  )
}
