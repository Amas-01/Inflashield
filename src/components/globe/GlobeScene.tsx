'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Currency nodes with lat/lng coordinates
const CURRENCY_NODES = [
  { name: 'Lagos', lat: 6.5, lng: 3.4 },
  { name: 'Istanbul', lat: 41, lng: 29 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.4 },
  { name: 'Cairo', lat: 30.1, lng: 31.2 },
  { name: 'Karachi', lat: 24.9, lng: 67 },
  { name: 'London', lat: 51.5, lng: -0.1 },
  { name: 'New York', lat: 40.7, lng: -74 },
  { name: 'São Paulo', lat: -23.5, lng: -46.6 },
  { name: 'Nairobi', lat: -1.3, lng: 36.8 },
  { name: 'Tehran', lat: 35.7, lng: 51.4 },
  { name: 'Accra', lat: 5.6, lng: -0.2 },
  { name: 'Manila', lat: 14.6, lng: 120.9 },
]

// Convert lat/lng to cartesian coordinates
function latLngToCartesian(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return { x, y, z }
}

function PulsingRing({ position, offset }: { position: [number, number, number]; offset: number }) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.75
      ringRef.current.scale.set(scale, scale, 1)
      const opacity = 1 - (scale - 1) / 1.5
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6
    }
  })

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.12, 0.005, 16, 32]} />
      <meshBasicMaterial color="#F5C842" transparent opacity={0.6} />
    </mesh>
  )
}

function CurrencyNode({ lat, lng, index }: { lat: number; lng: number; index: number }) {
  const radius = 2.8
  const position = latLngToCartesian(lat, lng, radius)

  return (
    <group>
      {/* Currency point */}
      <mesh position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#F5C842" emissive="#F5C842" emissiveIntensity={0.5} />
      </mesh>
      {/* Pulsing ring */}
      <PulsingRing position={[position.x, position.y, position.z]} offset={index * 0.5} />
    </group>
  )
}

function Globe() {
  const globeRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.003
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
    }
  })

  return (
    <group ref={globeRef}>
      {/* Main globe */}
      <mesh>
        <sphereGeometry args={[2.8, 64, 64]} />
        <meshStandardMaterial color="#0D1829" />
      </mesh>
      
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.85, 32, 32]} />
        <meshBasicMaterial color="#1E3A5F" wireframe opacity={0.3} transparent />
      </mesh>

      {/* Currency nodes */}
      {CURRENCY_NODES.map((node, index) => (
        <CurrencyNode key={node.name} lat={node.lat} lng={node.lng} index={index} />
      ))}
    </group>
  )
}

export default function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#F5C842" />
      <Globe />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  )
}
