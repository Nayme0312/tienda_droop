"use client"

import { memo, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { cancelFrame, scheduleFrame } from "@/lib/animation-frame"

/**
 * Texto en particulas (basado en text_particle.md).
 *
 * Mismo efecto que el original: el texto se rasteriza en un canvas, se toma
 * una particula cada `particleDensity` px donde el alfa supera 128, el cursor
 * atrae las particulas a menos de 100 px (fuerza 3) y cada una vuelve a su
 * sitio con un resorte de 0.05.
 *
 * Adaptado para el Hero:
 * - Se coloca DENTRO del elemento de texto (que debe ser `relative`) y copia
 *   su texto real: fuente, peso, cursiva, tamano, espaciado, color y saltos de
 *   linea salen del propio DOM, asi que la maqueta responsive no cambia.
 * - El texto del DOM sigue ahi (lectores de pantalla, seleccion, layout y su
 *   text-shadow); solo se vuelve transparente su relleno cuando las
 *   particulas ya estan pintadas. Sin JS o mientras carga, se ve el texto.
 * - El color se lee del elemento mientras hay animacion, asi que sigue al
 *   modo claro/oscuro y a las transiciones de hover.
 * - Canvas con pointer-events: none: no tapa enlaces ni botones. En tactil un
 *   toque atrae las particulas un instante sin bloquear el scroll.
 * - Rendimiento: comparte un unico requestAnimationFrame (lib/animation-frame)
 *   que solo corre mientras hay interaccion, particulas en movimiento o una
 *   transicion de color; en reposo el canvas conserva el ultimo frame sin
 *   redibujar. Pausa fuera de pantalla y con la pestana oculta. Particulas en
 *   arrays tipados y un solo fill por frame.
 */

/** Radio de atraccion y fuerza del original, en px CSS. */
const ATTRACT_RADIUS = 100
const ATTRACT_FORCE = 3
const RETURN_SPEED = 0.05
/** Tras soltar el dedo, las particulas siguen atraidas este tiempo. */
const TOUCH_HOLD_MS = 500
/** Margen para seguir las transiciones de color del Hero (500 ms). */
const COLOR_TRANSITION_MS = 700

function TextParticleCanvas({
  particleDensity,
  particleSize,
  particleColor,
  className,
}: {
  /** Separacion entre particulas en px CSS. Por defecto, segun el tamano de letra. */
  particleDensity?: number
  /** Radio de cada particula en px CSS. Por defecto, 0.72 de la separacion. */
  particleSize?: number
  /** Color fijo. Por defecto, el color actual del texto (sigue el tema). */
  particleColor?: string
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const ctx = canvas?.getContext("2d")
    if (!canvas || !host || !ctx) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches

    // Particulas: posicion actual (x, y) y de reposo (bx, by), en px del canvas
    let count = 0
    let x = new Float64Array(0)
    let y = new Float64Array(0)
    let bx = new Float64Array(0)
    let by = new Float64Array(0)

    let dpr = 1
    let pad = 0
    let radius = 1
    let visible = true
    let settled = false
    let lastColor = ""
    let busyUntil = 0
    let releaseTimer = 0
    let disposed = false
    const mouse = { x: null as number | null, y: null as number | null }

    const hostStyle = () => getComputedStyle(host)

    /** Nodos de texto del elemento (sin el propio canvas). */
    const textNodes = () => {
      const nodes: Text[] = []
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) nodes.push(walker.currentNode as Text)
      return nodes
    }

    const initText = () => {
      const cs = hostStyle()
      const fontSize = parseFloat(cs.fontSize) || 16
      // Siempre a 2x (tambien en pantallas 1x): con menos resolucion los
      // trazos finos (cursiva light, texto de 12 px) salian dentados
      dpr = 2
      pad = Math.ceil(fontSize * 0.3) + 4

      const w = host.offsetWidth
      const h = host.offsetHeight
      if (!w || !h) return

      canvas.style.left = `${-pad}px`
      canvas.style.top = `${-pad}px`
      canvas.style.width = `${w + pad * 2}px`
      canvas.style.height = `${h + pad * 2}px`
      canvas.width = Math.round((w + pad * 2) * dpr)
      canvas.height = Math.round((h + pad * 2) * dpr)

      const stepCss = particleDensity ?? Math.min(4, Math.max(0.75, fontSize / 40))
      // Tactil (moviles): en los textos grandes una particula cada 1.5 px CSS
      // como minimo. Alli el redondeo bajaba a 1 px y un toque movia miles de
      // particulas a la vez; el radio escala con la separacion, asi que en
      // reposo la letra sigue igual de solida. Los textos pequenos no cambian.
      const minStep = coarsePointer && fontSize >= 28 ? 3 : 1
      const step = Math.max(minStep, Math.round(stepCss * dpr))
      // 0.72 de la separacion: en reposo las particulas se solapan y la letra
      // conserva su color y su peso; al moverlas se ven sueltas
      radius = particleSize != null ? particleSize * dpr : step * 0.72

      // Rasteriza cada caracter en la posicion exacta que ocupa en el DOM
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      ctx.fillStyle = "black"
      ctx.textAlign = "left"
      ctx.textBaseline = "alphabetic"

      const metrics = ctx.measureText("Hg")
      const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.8
      const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.2

      const hostRect = host.getBoundingClientRect()
      // Corrige transformaciones en curso (entrada de Framer Motion, hover)
      const scale = hostRect.width / w || 1
      const range = document.createRange()

      for (const node of textNodes()) {
        const text = node.data
        for (let i = 0; i < text.length; i++) {
          const char = text[i]
          if (!char.trim()) continue
          range.setStart(node, i)
          range.setEnd(node, i + 1)
          const r = range.getBoundingClientRect()
          if (!r.width) continue
          const left = (r.left - hostRect.left) / scale + pad
          const top = (r.top - hostRect.top) / scale + pad
          const boxH = r.height / scale
          const baseline = top + (boxH - (ascent + descent)) / 2 + ascent
          ctx.fillText(char, left, baseline)
        }
      }
      range.detach()

      // Muestreo en dos pasadas: contar y luego llenar arrays del tamano justo
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = data.data
      let n = 0
      for (let py = 0; py < data.height; py += step)
        for (let px = 0; px < data.width; px += step)
          if (pixels[(py * data.width + px) * 4 + 3] > 128) n++

      x = new Float64Array(n)
      y = new Float64Array(n)
      bx = new Float64Array(n)
      by = new Float64Array(n)
      let k = 0
      for (let py = 0; py < data.height; py += step) {
        for (let px = 0; px < data.width; px += step) {
          if (pixels[(py * data.width + px) * 4 + 3] > 128) {
            x[k] = bx[k] = px
            y[k] = by[k] = py
            k++
          }
        }
      }
      count = n

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      settled = false
      lastColor = ""

      if (count) host.dataset.textParticle = "ready"
      else delete host.dataset.textParticle
    }

    /**
     * Un frame. Devuelve true mientras haga falta otro: cursor/dedo activo,
     * particulas volviendo a su sitio o una transicion de color en curso.
     */
    const frame = (now: number) => {
      if (disposed || !visible || !count) return false

      const color = particleColor ?? hostStyle().color
      const active = mouse.x !== null && mouse.y !== null
      const fullRedraw = color !== lastColor

      if (!settled || active || fullRedraw) {
        lastColor = color

        const reach = ATTRACT_RADIUS * dpr
        const force = ATTRACT_FORCE * dpr
        const mx = mouse.x ?? 0
        const my = mouse.y ?? 0
        let moving = false
        // Rectangulo que cambia este frame: posiciones anterior y nueva de
        // cada particula que se mueve
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (let i = 0; i < count; i++) {
          const px0 = x[i]
          const py0 = y[i]
          const baseX = bx[i]
          const baseY = by[i]

          // En reposo y fuera del alcance del cursor no hay nada que calcular
          if (
            px0 === baseX &&
            py0 === baseY &&
            (!active || Math.abs(mx - px0) >= reach || Math.abs(my - py0) >= reach)
          ) {
            continue
          }

          let fx = 0
          let fy = 0
          if (active) {
            const dx = mx - px0
            const dy = my - py0
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance < reach && distance > 0) {
              fx = (dx / distance) * force
              fy = (dy / distance) * force
            }
          }
          let px = px0 + fx + (baseX - px0) * RETURN_SPEED
          let py = py0 + fy + (baseY - py0) * RETURN_SPEED

          if (Math.abs(baseX - px) > 0.05 || Math.abs(baseY - py) > 0.05) {
            moving = true
          } else if (!active) {
            px = baseX
            py = baseY
          }
          x[i] = px
          y[i] = py

          if (px !== px0 || py !== py0) {
            minX = Math.min(minX, px0, px)
            minY = Math.min(minY, py0, py)
            maxX = Math.max(maxX, px0, px)
            maxY = Math.max(maxY, py0, py)
          }
        }

        // Solo se borra y repinta la zona que ha cambiado (con todas las
        // particulas que la tocan): fuera de ella los pixeles ya son correctos
        // El frame en que todo queda en reposo se pinta entero: el antialias
        // de miles de circulos solapados varia un poco segun el tamano del
        // trazo, y asi el texto en reposo queda identico al original
        let left = 0
        let top = 0
        let right = canvas.width
        let bottom = canvas.height
        if (!fullRedraw && (active || moving)) {
          const margin = radius + 2
          left = Math.max(0, Math.floor(minX - margin))
          top = Math.max(0, Math.floor(minY - margin))
          right = Math.min(canvas.width, Math.ceil(maxX + margin))
          bottom = Math.min(canvas.height, Math.ceil(maxY + margin))
        }

        if (right > left && bottom > top) {
          const fullArea = left === 0 && top === 0 && right === canvas.width && bottom === canvas.height
          ctx.save()
          if (!fullArea) {
            ctx.beginPath()
            ctx.rect(left, top, right - left, bottom - top)
            ctx.clip()
          }
          ctx.clearRect(left, top, right - left, bottom - top)
          ctx.beginPath()
          // Margen de radio + 1: el borde antialias de una particula situada
          // justo fuera de la zona tambien cae dentro y hay que repintarlo
          const reachOut = radius + 1
          const l = left - reachOut
          const t = top - reachOut
          const r = right + reachOut
          const b = bottom + reachOut
          for (let i = 0; i < count; i++) {
            const px = x[i]
            const py = y[i]
            if (px < l || px > r || py < t || py > b) continue
            ctx.moveTo(px + radius, py)
            ctx.arc(px, py, radius, 0, Math.PI * 2)
          }
          ctx.fillStyle = color
          ctx.fill()
          ctx.restore()
        }

        settled = !active && !moving
      }

      return !settled || active || now < busyUntil
    }

    const wake = () => scheduleFrame(frame)

    /** Mantiene el bucle unos ms para seguir una transicion de color. */
    const followColor = () => {
      busyUntil = performance.now() + COLOR_TRANSITION_MS
      wake()
    }

    const setPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scale = rect.width / (canvas.width / dpr) || 1
      mouse.x = ((e.clientX - rect.left) / scale) * dpr
      mouse.y = ((e.clientY - rect.top) / scale) * dpr
      settled = false
      wake()
    }

    const clearPointer = () => {
      mouse.x = null
      mouse.y = null
      wake()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && mouse.x === null) return
      window.clearTimeout(releaseTimer)
      setPointer(e)
    }

    // Tactil: el toque atrae las particulas y se sueltan poco despues
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return
      window.clearTimeout(releaseTimer)
      setPointer(e)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return
      window.clearTimeout(releaseTimer)
      releaseTimer = window.setTimeout(clearPointer, TOUCH_HOLD_MS)
    }

    // El hover del Hero cambia el color del texto con transicion
    const onPointerEnter = () => followColor()

    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") clearPointer()
      followColor()
    }

    let resizeFrame = 0
    const scheduleInit = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        if (disposed) return
        initText()
        wake()
      })
    }

    const resizeObserver = new ResizeObserver(scheduleInit)
    resizeObserver.observe(host)

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        settled = false
        wake()
      }
    })
    intersection.observe(host)

    // Cambio de tema: el color del texto transiciona
    const themeObserver = new MutationObserver(followColor)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    // La fuente web puede llegar despues del primer pintado
    document.fonts?.ready.then(scheduleInit)
    document.fonts?.addEventListener("loadingdone", scheduleInit)

    host.addEventListener("pointerenter", onPointerEnter)
    host.addEventListener("pointerleave", onPointerLeave)
    if (!reduceMotion) {
      host.addEventListener("pointermove", onPointerMove)
      host.addEventListener("pointerdown", onPointerDown)
      host.addEventListener("pointerup", onPointerUp)
      host.addEventListener("pointercancel", onPointerUp)
    }

    return () => {
      disposed = true
      cancelFrame(frame)
      cancelAnimationFrame(resizeFrame)
      window.clearTimeout(releaseTimer)
      resizeObserver.disconnect()
      intersection.disconnect()
      themeObserver.disconnect()
      document.fonts?.removeEventListener("loadingdone", scheduleInit)
      host.removeEventListener("pointerenter", onPointerEnter)
      host.removeEventListener("pointerleave", onPointerLeave)
      host.removeEventListener("pointermove", onPointerMove)
      host.removeEventListener("pointerdown", onPointerDown)
      host.removeEventListener("pointerup", onPointerUp)
      host.removeEventListener("pointercancel", onPointerUp)
      delete host.dataset.textParticle
    }
  }, [particleDensity, particleSize, particleColor])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
    />
  )
}

export const TextParticle = memo(TextParticleCanvas)

export default TextParticle
