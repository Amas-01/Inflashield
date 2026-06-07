'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import CountUp from 'react-countup'

const STATS = [
  {
    value: 2.6,
    suffix: ' Billion',
    description: 'people live in countries with 10%+ annual inflation',
  },
  {
    value: 170,
    suffix: '+',
    description: 'currencies losing value against USD',
  },
  {
    value: 0,
    prefix: '$',
    description: 'broker account needed to use InflaShield',
  },
  {
    value: 60,
    suffix: ' sec',
    description: 'from problem to on-chain protection',
  },
]

function StatCard({
  stat,
  delay,
}: {
  stat: {
    value: number
    prefix?: string
    suffix?: string
    description: string
  }
  delay: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="glass border-l-2 border-gold-500 p-6 rounded-xl"
    >
      <div className="font-space-grotesk text-5xl lg:text-6xl text-gradient-gold font-bold mb-2">
        {isInView ? (
          <>
            {stat.prefix}
            <CountUp
              end={stat.value}
              duration={2}
              decimals={stat.value < 10 ? 1 : 0}
              separator=","
            />
            {stat.suffix}
          </>
        ) : (
          <>
            {stat.prefix}0{stat.suffix}
          </>
        )}
      </div>
      <p className="font-urbanist text-text-secondary text-sm leading-relaxed">
        {stat.description}
      </p>
    </motion.div>
  )
}

export default function GlobalScaleSection() {
  return (
    <section className="py-24 lg:py-32 bg-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-syne text-4xl lg:text-5xl text-white text-center mb-16 font-bold"
        >
          The problem is bigger than you think
        </motion.h2>

        {/* Stats grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {STATS.map((stat, index) => (
            <StatCard key={index} stat={stat} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  )
}
