import { useEffect, useRef } from 'react'

export default function PulseRings({ size = 340 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = size
    canvas.height = size
    let animId
    const cx = size / 2
    const cy = size / 2

    const rings = [
      { baseR: size * 0.14, speed: 0.0008, phase: 0 },
      { baseR: size * 0.22, speed: 0.0006, phase: 1.1 },
      { baseR: size * 0.31, speed: 0.0004, phase: 2.3 },
      { baseR: size * 0.40, speed: 0.0003, phase: 0.7 },
      { baseR: size * 0.48, speed: 0.0002, phase: 1.8 },
    ]

    function draw(t) {
      ctx.clearRect(0, 0, size, size)
      rings.forEach((ring, i) => {
        const pulse = Math.sin(t * ring.speed * 1000 + ring.phase)
        const r = ring.baseR + pulse * (size * 0.018)
        const alpha = 0.12 + 0.08 * Math.abs(pulse)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201,168,76,${alpha})`
        ctx.lineWidth = 1 + (5 - i) * 0.2
        ctx.stroke()
      })
    }

    function loop(t) {
      draw(t)
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
    />
  )
}
