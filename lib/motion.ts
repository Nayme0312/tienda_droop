import type { Transition, Variants } from "framer-motion"

/**
 * Curvas y variantes compartidas por las animaciones de la tienda, para que
 * todas las secciones se muevan con el mismo ritmo.
 */

/** Salida rapida y frenado largo: se siente "premium" sin ser lenta. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Viewport comun: dispara un poco antes de que el bloque entre del todo. */
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const

/** Contenedor que escalona la entrada de sus hijos. */
export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
})

/** Hijo tipico: fade + desplazamiento vertical corto. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
}

/** Variante lateral para las columnas de titulo. */
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT } },
}

/** Linea decorativa que se "dibuja" de izquierda a derecha. */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.9, ease: EASE_OUT } },
}

export const layoutTransition: Transition = { duration: 0.45, ease: EASE_OUT }
