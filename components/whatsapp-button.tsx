"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ADMIN_BASE_PATH } from "@/lib/admin/routes"
import { EASE_OUT } from "@/lib/motion"
import { whatsappUrl } from "@/lib/contact"

/** Retraso antes de mostrar la burbuja de saludo, y cuanto tiempo se queda. */
const BUBBLE_DELAY_MS = 4000
const BUBBLE_VISIBLE_MS = 7000
/** La burbuja solo aparece sola una vez por sesion (despues, solo al hover). */
const BUBBLE_SEEN_KEY = "streetvibe:whatsapp-bubble-seen"
/** Posicion elegida por el usuario, recordada entre visitas. */
const POSITION_KEY = "streetvibe:whatsapp-position"

/**
 * Pixeles que tiene que moverse el puntero para que el gesto cuente como
 * arrastre. Por debajo es un clic (un dedo nunca se queda totalmente quieto).
 */
const DRAG_THRESHOLD_PX = 6
/** Distancia minima a los bordes de la pantalla. */
const EDGE_MARGIN_PX = 8

/**
 * Posicion guardada como fraccion del espacio libre (0 = izquierda/arriba,
 * 1 = derecha/abajo), no en pixeles: asi sigue en el mismo sitio relativo al
 * girar el movil o cambiar el tamano de la ventana.
 */
interface RelativePosition {
  rx: number
  ry: number
}

interface PixelPosition {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Limites para la esquina superior izquierda de un boton de `size` px. */
function bounds(size: number) {
  return {
    minX: EDGE_MARGIN_PX,
    minY: EDGE_MARGIN_PX,
    maxX: Math.max(EDGE_MARGIN_PX, window.innerWidth - size - EDGE_MARGIN_PX),
    maxY: Math.max(EDGE_MARGIN_PX, window.innerHeight - size - EDGE_MARGIN_PX),
  }
}

function toPixels(rel: RelativePosition, size: number): PixelPosition {
  const b = bounds(size)
  return {
    x: b.minX + clamp(rel.rx, 0, 1) * (b.maxX - b.minX),
    y: b.minY + clamp(rel.ry, 0, 1) * (b.maxY - b.minY),
  }
}

function toRelative(pos: PixelPosition, size: number): RelativePosition {
  const b = bounds(size)
  return {
    rx: b.maxX > b.minX ? (pos.x - b.minX) / (b.maxX - b.minX) : 1,
    ry: b.maxY > b.minY ? (pos.y - b.minY) / (b.maxY - b.minY) : 1,
  }
}

function readSavedPosition(): RelativePosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RelativePosition>
    if (typeof parsed.rx !== "number" || typeof parsed.ry !== "number") return null
    if (!Number.isFinite(parsed.rx) || !Number.isFinite(parsed.ry)) return null
    return { rx: clamp(parsed.rx, 0, 1), ry: clamp(parsed.ry, 0, 1) }
  } catch {
    return null
  }
}

/**
 * Boton flotante de WhatsApp, compacto y arrastrable.
 *
 * - Por defecto queda abajo a la derecha (respetando el area segura de los
 *   moviles con notch).
 * - Se puede arrastrar con el raton o con el dedo a cualquier punto de la
 *   pantalla; la posicion se recuerda entre visitas.
 * - Un toque/clic abre el chat; un arrastre NUNCA lo abre: si el puntero se
 *   movio mas de DRAG_THRESHOLD_PX, el clic que el navegador dispara al soltar
 *   se cancela.
 * - Con teclado (Tab + Enter) funciona como un enlace normal.
 *
 * Queda por debajo de los modales y del carrito (z-[55]) y no se muestra en
 * el panel administrativo.
 */
export function WhatsAppButton() {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const buttonRef = useRef<HTMLAnchorElement>(null)

  /** null = posicion por defecto (abajo a la derecha, via CSS). */
  const [position, setPosition] = useState<PixelPosition | null>(null)
  const relativeRef = useRef<RelativePosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Estado del gesto en curso (refs: cambian en cada pointermove sin re-render).
  const gesture = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  /** true tras un arrastre: el siguiente click no debe abrir el chat. */
  const suppressClick = useRef(false)

  const buttonSize = useCallback(
    () => buttonRef.current?.offsetWidth ?? 48,
    [],
  )

  // Posicion guardada (solo en el cliente, tras montar: evita desajustes de hidratacion).
  useEffect(() => {
    const saved = readSavedPosition()
    if (!saved) return
    relativeRef.current = saved
    setPosition(toPixels(saved, buttonSize()))
  }, [buttonSize])

  // Al cambiar el tamano de la ventana o girar el movil, el boton sigue visible.
  useEffect(() => {
    const onResize = () => {
      if (!relativeRef.current) return
      setPosition(toPixels(relativeRef.current, buttonSize()))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [buttonSize])

  // Burbuja de saludo, una vez por sesion.
  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(BUBBLE_SEEN_KEY) === "1"
    } catch {
      // Almacenamiento bloqueado: se muestra igualmente.
    }
    if (seen) return

    const show = window.setTimeout(() => {
      setBubbleOpen(true)
      try {
        sessionStorage.setItem(BUBBLE_SEEN_KEY, "1")
      } catch {}
    }, BUBBLE_DELAY_MS)
    const hide = window.setTimeout(
      () => setBubbleOpen(false),
      BUBBLE_DELAY_MS + BUBBLE_VISIBLE_MS,
    )
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])

  if (pathname?.startsWith(ADMIN_BASE_PATH)) return null

  // --- Arrastre ------------------------------------------------------------

  const handlePointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
    // Solo boton principal del raton; dedo y lapiz siempre.
    if (event.pointerType === "mouse" && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    suppressClick.current = false
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return

    const dx = event.clientX - g.startX
    const dy = event.clientY - g.startY
    if (!g.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      g.moved = true
      setIsDragging(true)
      setBubbleOpen(false)
      setHovered(false)
    }

    const b = bounds(buttonSize())
    setPosition({
      x: clamp(g.originX + dx, b.minX, b.maxX),
      y: clamp(g.originY + dy, b.minY, b.maxY),
    })
  }

  const endGesture = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!g.moved) return

    // Fue un arrastre: el click que llega justo despues no debe abrir el chat.
    suppressClick.current = true
    setIsDragging(false)

    const rect = event.currentTarget.getBoundingClientRect()
    const rel = toRelative({ x: rect.left, y: rect.top }, rect.width)
    relativeRef.current = rel
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(rel))
    } catch {
      // Sin almacenamiento la posicion dura hasta recargar.
    }
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressClick.current) {
      event.preventDefault()
      suppressClick.current = false
    }
  }

  // --- Burbuja: al lado del boton que este mas lejos del borde -------------

  const onLeftHalf =
    position !== null && typeof window !== "undefined"
      ? position.x + buttonSize() / 2 < window.innerWidth / 2
      : false
  const onTopHalf =
    position !== null && typeof window !== "undefined"
      ? position.y + buttonSize() / 2 < window.innerHeight / 2
      : false

  const showBubble = (bubbleOpen || hovered) && !isDragging

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.5, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.6 }}
      className="fixed z-[55] size-12"
      style={
        position
          ? { left: position.x, top: position.y }
          : {
              right: "max(1rem, env(safe-area-inset-right))",
              bottom: "max(1rem, env(safe-area-inset-bottom))",
            }
      }
    >
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, x: onLeftHalf ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: onLeftHalf ? -8 : 8, scale: 0.95 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className={cn(
              "absolute w-max max-w-[13rem] rounded-2xl border border-border bg-card/95 py-2.5 pl-3.5 pr-8 text-left shadow-2xl shadow-black/40 backdrop-blur-md",
              onLeftHalf ? "left-full ml-3 rounded-bl-sm" : "right-full mr-3 rounded-br-sm",
              onTopHalf ? "top-0" : "bottom-0",
            )}
          >
            <p className="text-sm font-semibold text-foreground">¿Necesitas ayuda?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Escríbenos por WhatsApp. Puedes arrastrar el botón si te estorba.
            </p>
            <button
              type="button"
              onClick={() => {
                setBubbleOpen(false)
                setHovered(false)
              }}
              aria-label="Cerrar mensaje"
              className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        ref={buttonRef}
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribenos por WhatsApp"
        title="Escribenos por WhatsApp (arrastra para moverlo)"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        // Se "levanta" mientras se arrastra.
        animate={{ scale: isDragging ? 1.12 : 1 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        whileHover={reduceMotion || isDragging ? undefined : { scale: 1.08 }}
        className={cn(
          "group relative flex size-12 select-none items-center justify-center rounded-full bg-[#25D366] text-white outline-none ring-1 ring-white/15 ring-offset-2 ring-offset-background transition-shadow duration-300 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-[#25D366]",
          // touch-none: el dedo arrastra el boton en vez de desplazar la pagina.
          "touch-none",
          isDragging
            ? "cursor-grabbing shadow-2xl shadow-black/50"
            : "cursor-grab shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-[#25D366]/40",
        )}
      >
        {/* Onda sutil (app/globals.css); se apaga al arrastrar y con movimiento reducido */}
        {!isDragging && (
          <span
            aria-hidden
            className="whatsapp-ping pointer-events-none absolute inset-0 rounded-full bg-[#25D366] opacity-0"
          />
        )}

        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="currentColor"
          className="pointer-events-none relative size-6"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </motion.a>
    </motion.div>
  )
}
