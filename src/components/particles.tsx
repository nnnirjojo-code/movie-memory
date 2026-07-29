// 📁 src/components/particles.tsx — 粒子背景动画
'use client'

import { useEffect, useRef } from 'react'

interface ParticleState {
  x: number; y: number; r: number; dx: number; dy: number; o: number
}

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0
    const particles: ParticleState[] = []

    function resize() {
      w = cvs!.width = window.innerWidth
      h = cvs!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function createParticle(): ParticleState {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.4,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.3 + 0.05,
      }
    }

    function updateParticle(p: ParticleState) {
      p.x += p.dx; p.y += p.dy
      if (p.x < 0 || p.x > w) p.dx *= -1
      if (p.y < 0 || p.y > h) p.dy *= -1
    }

    function drawParticle(p: ParticleState) {
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(192,57,43,${p.o})`
      ctx!.fill()
    }

    const count = Math.min(80, Math.floor((w * h) / 15000))
    for (let i = 0; i < count; i++) particles.push(createParticle())

    function connect() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(192,57,43,${0.06 * (1 - dist / 150)})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }
    }

    let animId: number
    function loop() {
      ctx!.clearRect(0, 0, w, h)
      particles.forEach(p => { updateParticle(p); drawParticle(p) })
      connect()
      animId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
}
