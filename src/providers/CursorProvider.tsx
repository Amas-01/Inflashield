'use client'

import { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

export default function CursorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHoveringExpand, setIsHoveringExpand] = useState(false)
  const [isHoveringGold, setIsHoveringGold] = useState(false)

  const cursorX = useSpring(mousePosition.x, {
    stiffness: 150,
    damping: 15,
    mass: 0.1,
  })
  const cursorY = useSpring(mousePosition.y, {
    stiffness: 150,
    damping: 15,
    mass: 0.1,
  })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="expand"]')) {
        setIsHoveringExpand(true)
      }
      if (target.closest('[data-cursor="gold"]')) {
        setIsHoveringGold(true)
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="expand"]')) {
        setIsHoveringExpand(false)
      }
      if (target.closest('[data-cursor="gold"]')) {
        setIsHoveringGold(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  return (
    <>
      {children}
      {/* Custom cursor - desktop only */}
      <div className="custom-cursor">
        {/* Main cursor dot */}
        <div
          className="fixed w-3 h-3 rounded-full bg-gold-500 pointer-events-none z-[9999] mix-blend-difference"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* Follower ring */}
        <motion.div
          className="fixed w-10 h-10 rounded-full pointer-events-none z-[9999]"
          style={{
            left: cursorX,
            top: cursorY,
            x: '-50%',
            y: '-50%',
            border: `2px solid ${isHoveringGold ? 'var(--color-gold-500)' : 'rgba(255,255,255,0.3)'}`,
            scale: isHoveringExpand ? 1.5 : 1,
          }}
          transition={{
            scale: {
              duration: 0.2,
            },
          }}
        />
      </div>
    </>
  )
}
