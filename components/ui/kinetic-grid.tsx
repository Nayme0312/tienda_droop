"use client"

import { memo, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { cancelFrame, scheduleFrame } from "@/lib/animation-frame"

/**
 * Fondo de cuadricula interactiva: la malla se deforma alrededor del cursor y
 * cada clic lanza una onda.
 *
 * Adaptado a la tienda:
 * - Solo pinta el <canvas> (fixed, -z-10, pointer-events: none): queda detras
 *   de todo el contenido y nunca intercepta clics, scroll ni foco. Para que se
 *   vea, globals.css deja transparente el fondo del body mientras este montado
 *   (el html ya pinta --background, asi que el color de la pagina no cambia).
 * - El canvas no tiene fondo propio: usa el --background de cada modo y las
 *   lineas cambian de color segun la clase `dark` del html.
 * - Los elementos con `data-kinetic-grid-exclude` (el Hero) quedan sin
 *   cuadricula, con un fundido suave en sus bordes.
 * - Rendimiento: comparte un unico requestAnimationFrame (lib/animation-frame)
 *   que solo corre mientras hay movimiento (cursor, ondas) y lo despiertan los
 *   eventos (scroll, tamano, tema); se detiene con la pestana oculta. Puntos
 *   cacheados, lineas y nodos en reposo en un solo trazo, vertices en arrays
 *   tipados. Con "reducir movimiento" la malla es estatica.
 */

interface Point {
  x: number
  y: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  opacity: number
  born: number
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

interface Palette {
  dot: string
  line: Rgba
  lineActive: Rgba
  node: Rgba
  nodeActive: Rgba
  glow: string
  ripple: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CELL_SIZE = 55
const INFLUENCE_RADIUS = 260
const MAX_WARP = 24
const DOT_SPACING = 28
const LERP_SPEED = 0.08
const NODE_BASE_RADIUS = 1.8
const NODE_ACTIVE_RADIUS = 3.2
/** Alto del fundido entre una zona excluida (Hero) y la cuadricula. */
const EXCLUDE_FADE = 140
const EXCLUDE_SELECTOR = "[data-kinetic-grid-exclude]"

/**
 * Colores por modo. En reposo la malla es muy tenue para no competir con los
 * productos; el acento frio sale del --glow del tema.
 */
const PALETTES: Record<
  "default" | "monochrome",
  { dark: Palette; light: Palette }
> = {
  default: {
    dark: {
      dot: "rgba(255,255,255,0.07)",
      line: { r: 255, g: 255, b: 255, a: 0.085 },
      lineActive: { r: 160, g: 185, b: 235, a: 0.6 },
      node: { r: 255, g: 255, b: 255, a: 0.2 },
      nodeActive: { r: 175, g: 198, b: 245, a: 0.9 },
      glow: "160,185,235",
      ripple: "160,185,235",
    },
    light: {
      dot: "rgba(0,0,0,0.08)",
      line: { r: 0, g: 0, b: 0, a: 0.075 },
      lineActive: { r: 45, g: 70, b: 125, a: 0.45 },
      node: { r: 0, g: 0, b: 0, a: 0.17 },
      nodeActive: { r: 45, g: 70, b: 125, a: 0.75 },
      glow: "45,70,125",
      ripple: "45,70,125",
    },
  },
  monochrome: {
    dark: {
      dot: "rgba(255,255,255,0.07)",
      line: { r: 255, g: 255, b: 255, a: 0.085 },
      lineActive: { r: 255, g: 255, b: 255, a: 0.55 },
      node: { r: 255, g: 255, b: 255, a: 0.2 },
      nodeActive: { r: 255, g: 255, b: 255, a: 0.9 },
      glow: "255,255,255",
      ripple: "255,255,255",
    },
    light: {
      dot: "rgba(0,0,0,0.08)",
      line: { r: 0, g: 0, b: 0, a: 0.075 },
      lineActive: { r: 0, g: 0, b: 0, a: 0.45 },
      node: { r: 0, g: 0, b: 0, a: 0.17 },
      nodeActive: { r: 0, g: 0, b: 0, a: 0.75 },
      glow: "0,0,0",
      ripple: "0,0,0",
    },
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpColor(base: Rgba, active: Rgba, t: number): string {
  const r = Math.round(lerpN(base.r, active.r, t))
  const g = Math.round(lerpN(base.g, active.g, t))
  const b = Math.round(lerpN(base.b, active.b, t))
  const a = lerpN(base.a, active.a, t)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

/**
 * Desplaza el vertice (col, row) por el cursor y las ondas y lo escribe en
 * `px`/`py`/`pr` (posicion y proximidad al cursor). Arrays tipados reutilizados
 * entre frames: sin objetos nuevos por vertice.
 */
function warpPoint(
  i: number,
  gx: number,
  gy: number,
  col: number,
  row: number,
  mouse: Point,
  ripples: Ripple[],
  cols: number,
  rows: number,
  px: Float64Array,
  py: Float64Array,
  pr: Float64Array,
) {
  // Los bordes de la malla quedan fijos (transicion suave)
  const edgeMargin = 1.5
  const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1)
  const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1)
  const pinFactor = colPin * colPin * rowPin * rowPin

  const dx = gx - mouse.x
  const dy = gy - mouse.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  pr[i] = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor

  let rx = 0
  let ry = 0
  for (const r of ripples) {
    const rdx = gx - r.x
    const rdy = gy - r.y
    const rdist = Math.sqrt(rdx * rdx + rdy * rdy)
    const waveWidth = 55
    const diff = rdist - r.radius
    if (Math.abs(diff) < waveWidth) {
      const strength =
        (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor
      // cos/sin de atan2(rdy, rdx) sin trigonometria
      const cos = rdist > 0 ? rdx / rdist : 1
      const sin = rdist > 0 ? rdy / rdist : 0
      const sign = diff < 0 ? -1 : 1
      rx -= cos * strength * sign
      ry -= sin * strength * sign
    }
  }

  if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
    const t = dist / INFLUENCE_RADIUS
    const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60)
    const warpAmt = eased * MAX_WARP * pinFactor
    px[i] = gx - (dx / dist) * warpAmt + rx
    py[i] = gy - (dy / dist) * warpAmt + ry
    return
  }

  px[i] = gx + rx
  py[i] = gy + ry
}

// ─── Componente ───────────────────────────────────────────────────────────────

function KineticGrid({
  className,
  globalColor = "default",
}: {
  className?: string
  globalColor?: "default" | "monochrome"
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    const mouse: Point = { x: -9999, y: -9999 }
    const target: Point = { x: -9999, y: -9999 }
    const ripples: Ripple[] = []
    let W = 0
    let H = 0
    let dpr = 1
    let lastKey = ""
    let disposed = false

    // Vertices de la malla (se reasignan solo si cambia el numero de celdas)
    let px = new Float64Array(0)
    let py = new Float64Array(0)
    let pr = new Float64Array(0)

    // Textura de puntos: estatica, se pinta una vez por tamano y tema
    const dotLayer = document.createElement("canvas")
    const dotCtx = dotLayer.getContext("2d")
    let dotKey = ""

    const setSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastKey = ""
      dotKey = ""
    }

    const renderDots = (palette: Palette) => {
      const key = `${canvas.width}x${canvas.height}|${palette.dot}`
      if (!dotCtx || key === dotKey) return
      dotKey = key
      dotLayer.width = canvas.width
      dotLayer.height = canvas.height
      dotCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dotCtx.fillStyle = palette.dot
      for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
          dotCtx.beginPath()
          dotCtx.arc(x, y, 0.7, 0, Math.PI * 2)
          dotCtx.fill()
        }
      }
    }

    /** Franjas verticales (en px de la ventana) ocupadas por el Hero. */
    const readExcluded = () => {
      const bands: { top: number; bottom: number }[] = []
      document.querySelectorAll(EXCLUDE_SELECTOR).forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.bottom + EXCLUDE_FADE > 0 && rect.top - EXCLUDE_FADE < H) {
          bands.push({ top: rect.top, bottom: rect.bottom })
        }
      })
      return bands
    }

    const draw = (
      now: number,
      palette: Palette,
      bands: { top: number; bottom: number }[],
    ) => {
      // Las ondas avanzan aunque el Hero tape la pantalla: si no, se
      // acumulaban sin caducar mientras no se pintaba nada
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const age = (now - r.born) / 1000
        r.radius = Math.max(0, age * 400)
        r.opacity = Math.max(0, 1 - age * 1.2)
        if (r.opacity <= 0) ripples.splice(i, 1)
      }

      ctx.clearRect(0, 0, W, H)

      // El Hero tapa toda la pantalla: no hay nada que pintar
      if (bands.some((b) => b.top <= 0 && b.bottom >= H)) return

      // Textura de puntos (cacheada)
      renderDots(palette)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(dotLayer, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Malla deformada
      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1
      const cellW = W / (cols - 1)
      const cellH = H / (rows - 1)
      const count = cols * rows
      if (px.length !== count) {
        px = new Float64Array(count)
        py = new Float64Array(count)
        pr = new Float64Array(count)
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          warpPoint(
            row * cols + col,
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
            px,
            py,
            pr,
          )
        }
      }

      // Lineas: los segmentos en reposo (lejos del cursor) comparten color y
      // grosor y van en un solo trazo; solo los activos se pintan uno a uno.
      // Horizontales y verticales por separado, en el mismo orden que antes,
      // para que los cruces se vean igual.
      const baseLine = lerpColor(palette.line, palette.lineActive, 0)
      ctx.lineCap = "butt"
      const strokeSegments = (horizontal: boolean) => {
        const outer = horizontal ? rows : cols
        const inner = horizontal ? cols - 1 : rows - 1
        const next = horizontal ? 1 : cols
        const index = (o: number, k: number) =>
          horizontal ? o * cols + k : k * cols + o

        ctx.beginPath()
        for (let o = 0; o < outer; o++) {
          for (let k = 0; k < inner; k++) {
            const a = index(o, k)
            if (pr[a] + pr[a + next] > 0) continue
            ctx.moveTo(px[a], py[a])
            ctx.lineTo(px[a + next], py[a + next])
          }
        }
        ctx.strokeStyle = baseLine
        ctx.lineWidth = 0.8
        ctx.stroke()

        for (let o = 0; o < outer; o++) {
          for (let k = 0; k < inner; k++) {
            const a = index(o, k)
            const b = a + next
            const avg = (pr[a] + pr[b]) / 2
            if (avg <= 0) continue
            const t = avg * avg * (3 - 2 * avg)
            ctx.beginPath()
            ctx.moveTo(px[a], py[a])
            ctx.lineTo(px[b], py[b])
            ctx.strokeStyle = lerpColor(palette.line, palette.lineActive, t)
            ctx.lineWidth = lerpN(0.8, 1.5, t)
            ctx.stroke()
          }
        }
      }
      strokeSegments(true)
      strokeSegments(false)

      // Nodos en reposo: color calculado una vez. Cada circulo va en su propio
      // relleno: agrupados en un solo trazo el borde antialias cambiaba
      ctx.fillStyle = lerpColor(palette.node, palette.nodeActive, 0)
      for (let i = 0; i < count; i++) {
        if (pr[i] > 0) continue
        ctx.beginPath()
        ctx.arc(px[i], py[i], NODE_BASE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }

      // Nodos activos, con su halo

      for (let i = 0; i < count; i++) {
        const p = pr[i]
        if (p <= 0) continue
        const x = px[i]
        const y = py[i]
        const t = p * p * (3 - 2 * p)
        const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t)

        if (t > 0.3) {
          const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7)
          const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR)
          grd.addColorStop(0, `rgba(${palette.glow},${(t * 0.3).toFixed(3)})`)
          grd.addColorStop(1, `rgba(${palette.glow},0)`)
          ctx.beginPath()
          ctx.arc(x, y, glowR, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = lerpColor(palette.node, palette.nodeActive, t)
        ctx.fill()
      }

      // Anillos de las ondas
      for (const r of ripples) {
        ctx.beginPath()
        ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${palette.ripple},${(r.opacity * 0.28).toFixed(3)})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Zonas excluidas (Hero): se borran con un fundido en sus bordes
      if (bands.length) {
        ctx.globalCompositeOperation = "destination-out"
        for (const { top, bottom } of bands) {
          ctx.fillStyle = "#000"
          ctx.fillRect(0, top, W, bottom - top)

          const below = ctx.createLinearGradient(0, bottom, 0, bottom + EXCLUDE_FADE)
          below.addColorStop(0, "rgba(0,0,0,1)")
          below.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = below
          ctx.fillRect(0, bottom, W, EXCLUDE_FADE)

          const above = ctx.createLinearGradient(0, top, 0, top - EXCLUDE_FADE)
          above.addColorStop(0, "rgba(0,0,0,1)")
          above.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = above
          ctx.fillRect(0, top - EXCLUDE_FADE, W, EXCLUDE_FADE)
        }
        ctx.globalCompositeOperation = "source-over"
      }
    }

    /**
     * Un frame. Devuelve true mientras quede movimiento (cursor acercandose a
     * su destino u ondas vivas); en reposo el bucle se detiene y solo lo
     * despiertan los eventos (cursor, clic, scroll, tamano, tema).
     */
    const frame = (now: number) => {
      if (disposed) return false
      mouse.x = lerpN(mouse.x, target.x, LERP_SPEED)
      mouse.y = lerpN(mouse.y, target.y, LERP_SPEED)
      if (Math.abs(target.x - mouse.x) < 0.1) mouse.x = target.x
      if (Math.abs(target.y - mouse.y) < 0.1) mouse.y = target.y

      const isDark = document.documentElement.classList.contains("dark")
      const bands = readExcluded()

      const key = `${isDark}|${mouse.x.toFixed(1)},${mouse.y.toFixed(1)}|${bands
        .map((b) => `${Math.round(b.top)}:${Math.round(b.bottom)}`)
        .join(",")}`
      if (ripples.length > 0 || key !== lastKey) {
        lastKey = key
        const palette = PALETTES[globalColor][isDark ? "dark" : "light"]
        draw(now, palette, bands)
      }

      return mouse.x !== target.x || mouse.y !== target.y || ripples.length > 0
    }

    const wake = () => scheduleFrame(frame)

    const onResize = () => {
      setSize()
      wake()
    }

    // Solo el raton deforma la malla; en tactil un toque lanza la onda
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      target.x = e.clientX
      target.y = e.clientY
      wake()
    }

    const onClick = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        opacity: 1,
        born: performance.now(),
      })
      wake()
    }

    // Cambio de tema (clase `dark` del html) y de alto de pagina (navegacion)
    const themeObserver = new MutationObserver(wake)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    const layoutObserver = new ResizeObserver(wake)
    layoutObserver.observe(document.body)

    setSize()
    wake()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", wake, { passive: true })
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true })
      window.addEventListener("click", onClick)
    }

    return () => {
      disposed = true
      cancelFrame(frame)
      themeObserver.disconnect()
      layoutObserver.disconnect()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", wake)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("click", onClick)
    }
  }, [globalColor])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-kinetic-grid
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 h-full w-full",
        className,
      )}
    />
  )
}

export default memo(KineticGrid)
