'use client'

import { Suspense, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const GlobeScene = dynamic(() => import('../globe/GlobeScene'), { ssr: false })

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      opacity: number
    }> = []

    // Create 80 particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.1,
        opacity: 0.3 + Math.random() * 0.3,
      })
    }

    function animate() {
      if (!canvas || !ctx) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        // Update position
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Draw particle
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />
}

export default function HeroSection() {
  const scrollToForm = () => {
    document.getElementById('hedge-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative min-h-screen flex items-center"
      style={{
        background: 'radial-gradient(circle at center, #0D1829 0%, #04090F 100%)',
      }}
    >
      {/* Particle field background */}
      <ParticleField />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div className="text-left order-2 lg:order-1">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="font-syne text-gold-500 uppercase tracking-[0.2em] text-sm font-semibold">
                INFLATION IS GLOBAL
                <span className="inline-block ml-1 w-[2px] h-4 bg-gold-500 animate-pulse" />
              </span>
            </motion.div>

            {/* Hero headline */}
            <div className="mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0 }}
                className="font-syne text-5xl lg:text-7xl font-bold text-white mb-2"
              >
                Your Money
              </motion.h1>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-syne text-5xl lg:text-7xl font-bold text-gradient-gold mb-2"
              >
                Doesn&apos;t Have To Lose
              </motion.h1>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="font-syne text-3xl lg:text-5xl font-bold text-white"
              >
                Value.
              </motion.h1>
            </div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="font-urbanist text-lg text-text-secondary mb-10 max-w-lg"
            >
              On-chain inflation hedge agent. Enter your currency — we handle the rest.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={scrollToForm}
                data-cursor="gold"
                className="bg-gold-500 hover:bg-gold-400 text-[#080F1C] font-urbanist font-semibold px-8 py-4 rounded-full transition-all duration-150 hover:scale-105 glow-gold"
              >
                Protect My Savings
              </button>
              <button
                onClick={scrollToHowItWorks}
                data-cursor="expand"
                className="border-2 border-gold-500 text-gold-500 font-urbanist font-semibold px-8 py-4 rounded-full transition-all duration-150 hover:bg-gold-500/10"
              >
                See how it works ↓
              </button>
            </motion.div>
          </div>

          {/* Globe column */}
          <div className="order-1 lg:order-2 h-[400px] lg:h-[600px]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin" />
                    <p className="text-text-tertiary text-sm mt-4 text-center">Loading globe...</p>
                  </div>
                </div>
              }
            >
              <GlobeScene />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-urbanist text-xs text-text-tertiary uppercase tracking-wider">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gold-500"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
