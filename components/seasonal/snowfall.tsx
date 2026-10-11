"use client"

import { useEffect, useRef } from "react"

interface Flake {
  x: number
  y: number
  radius: number
  speed: number
  drift: number
  phase: number
  alpha: number
}

/** Copos segun el area de la pantalla: pocos en movil, mas en escritorio. */
function flakeCount(width: number, height: number): number {
  return Math.round(Math.min(110, Math.max(32, (width * height) / 17000)))
}

function createFlake(width: number, height: number, anywhere: boolean): Flake {
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -6,
    radius: 0.8 + Math.random() * 2.2,
    speed: 18 + Math.random() * 42,
    drift: 8 + Math.random() * 18,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.35 + Math.random() * 0.45,
  }
}

/**
 * Nieve suave sobre toda la pagina.
 *
 * - Un unico <canvas> fijo y `pointer-events: none`: no intercepta clics ni
 *   scroll, asi que navegacion, carrito y checkout funcionan igual.
 * - Queda por debajo del navbar (z-50) y de modales y carrito.
 * - Se pausa con la pestana oculta y no se pinta con "reducir movimiento".
 * - En tema claro los copos son gris azulado para que se vean sobre fondo
 *   blanco.
 */
export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reduceMotion.matches) return

    let width = 0
    let height = 0
    let flakes: Flake[] = []
    let frame = 0
    let last = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = flakeCount(width, height)
      if (flakes.length > target) flakes = flakes.slice(0, target)
      while (flakes.length < target) flakes.push(createFlake(width, height, true))
    }

    const draw = (now: number) => {
      // Tope de 50 ms: al volver a la pestana los copos no dan un salto.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const isDark = document.documentElement.classList.contains("dark")
      const color = isDark ? "255, 255, 255" : "148, 163, 184"

      context.clearRect(0, 0, width, height)
      for (const flake of flakes) {
        flake.y += flake.speed * dt
        flake.phase += dt * 0.8
        const x = flake.x + Math.sin(flake.phase) * flake.drift

        if (flake.y - flake.radius > height) {
          Object.assign(flake, createFlake(width, height, false))
          continue
        }

        context.beginPath()
        context.arc(x, flake.y, flake.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(${color}, ${flake.alpha})`
        context.fill()
      }

      frame = requestAnimationFrame(draw)
    }

    const start = () => {
      cancelAnimationFrame(frame)
      last = performance.now()
      frame = requestAnimationFrame(draw)
    }

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame)
      else start()
    }

    resize()
    start()
    window.addEventListener("resize", resize)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  )
}
