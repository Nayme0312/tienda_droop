"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  X,
  Plus,
  Minus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const MIN_SCALE = 1
const MAX_SCALE = 6
const STEP = 1.4

interface ImageZoomProps {
  images: string[]
  index: number
  alt: string
  onIndexChange: (i: number) => void
  onClose: () => void
}

export function ImageZoom({
  images,
  index,
  alt,
  onIndexChange,
  onClose,
}: ImageZoomProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)

  // Punteros activos: 1 = paneo, 2 = pellizco
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const pan = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const hasGallery = images.length > 1

  // Limita el desplazamiento al area realmente pintada de la imagen
  // (object-contain deja franjas vacias que no deben poder arrastrarse)
  const clampOffset = useCallback(
    (x: number, y: number, s: number) => {
      const el = areaRef.current
      if (!el || !natural.w || !natural.h) return { x: 0, y: 0 }
      const cw = el.clientWidth
      const ch = el.clientHeight
      const ar = natural.w / natural.h
      const paintedW = ar > cw / ch ? cw : ch * ar
      const paintedH = ar > cw / ch ? cw / ar : ch
      const maxX = Math.max(0, (paintedW * s - cw) / 2)
      const maxY = Math.max(0, (paintedH * s - ch) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      }
    },
    [natural]
  )

  // Escala manteniendo fijo el punto (px, py), medido desde el centro del area
  const zoomTo = useCallback(
    (next: number, px = 0, py = 0) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
      const ratio = s / scale
      const nx = px - (px - offset.x) * ratio
      const ny = py - (py - offset.y) * ratio
      setScale(s)
      setOffset(s === MIN_SCALE ? { x: 0, y: 0 } : clampOffset(nx, ny, s))
    },
    [scale, offset, clampOffset]
  )

  const pointFromEvent = (clientX: number, clientY: number) => {
    const el = areaRef.current
    if (!el) return { px: 0, py: 0 }
    const r = el.getBoundingClientRect()
    return { px: clientX - r.left - r.width / 2, py: clientY - r.top - r.height / 2 }
  }

  const reset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // Al cambiar de imagen se vuelve al encuadre inicial
  useEffect(() => {
    reset()
  }, [index])

  // Rueda del raton: listener nativo no pasivo, si no preventDefault se ignora
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { px, py } = pointFromEvent(e.clientX, e.clientY)
      zoomTo(scale * (e.deltaY < 0 ? STEP : 1 / STEP), px, py)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [scale, zoomTo])

  // Bloquea el scroll de la pagina mientras el visor esta abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "+" || e.key === "=") zoomTo(scale * STEP)
      else if (e.key === "-") zoomTo(scale / STEP)
      else if (e.key === "0") reset()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [scale, zoomTo, onClose])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale }
      pan.current = null
      setDragging(false)
    } else if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      if (scale > 1) setDragging(true)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const { px, py } = pointFromEvent((a.x + b.x) / 2, (a.y + b.y) / 2)
      zoomTo(pinch.current.scale * (dist / pinch.current.dist), px, py)
    } else if (pan.current && scale > 1) {
      const dx = e.clientX - pan.current.x
      const dy = e.clientY - pan.current.y
      setOffset(clampOffset(pan.current.ox + dx, pan.current.oy + dy, scale))
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()]
      pan.current = { x: p.x, y: p.y, ox: offset.x, oy: offset.y }
    } else if (pointers.current.size === 0) {
      pan.current = null
      setDragging(false)
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const { px, py } = pointFromEvent(e.clientX, e.clientY)
    zoomTo(scale > 1.2 ? MIN_SCALE : 2.5, px, py)
  }

  const step = (dir: number) => onIndexChange((index + dir + images.length) % images.length)

  const btn =
    "rounded-full bg-background/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-foreground/70"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-background/95 backdrop-blur-sm"
    >
      {/* Barra superior */}
      <div className="flex shrink-0 items-center justify-between gap-2 p-3 sm:p-4">
        <span className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 backdrop-blur-sm">
          {Math.round(scale * 100)}%
          {hasGallery && ` · ${index + 1}/${images.length}`}
        </span>
        <button onClick={onClose} className={btn} aria-label="Cerrar zoom">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Area de zoom: touch-none evita que el navegador haga scroll o zoom propio */}
      <div
        ref={areaRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onDoubleClick}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging || pinch.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          <Image
            src={images[index]}
            alt={alt}
            fill
            priority
            draggable={false}
            sizes="100vw"
            className="object-contain"
            onLoad={(e) =>
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
          />
        </div>

        {hasGallery && (
          <>
            <button
              onClick={() => step(-1)}
              className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 ${btn}`}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => step(1)}
              className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 ${btn}`}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Barra inferior: controles de zoom y miniaturas */}
      <div className="flex shrink-0 flex-col items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-xl bg-background/80 p-1.5 backdrop-blur-sm">
          <button
            onClick={() => zoomTo(scale / STEP)}
            disabled={scale <= MIN_SCALE}
            className={btn}
            aria-label="Alejar"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={reset}
            disabled={scale === MIN_SCALE && offset.x === 0 && offset.y === 0}
            className={btn}
            aria-label="Restablecer zoom"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => zoomTo(scale * STEP)}
            disabled={scale >= MAX_SCALE}
            className={btn}
            aria-label="Acercar"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {hasGallery && (
          <div className="flex max-w-full flex-wrap justify-center gap-2 rounded-xl bg-background/80 p-1.5 backdrop-blur-sm">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                onClick={() => onIndexChange(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === index}
                className={`relative h-10 w-10 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  i === index
                    ? "border-foreground"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="40px" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
