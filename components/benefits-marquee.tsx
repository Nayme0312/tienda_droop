"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { splitMarqueeText } from "@/lib/marquee/marquee"

/* Velocidad de desplazamiento en px/s. Fija en pixeles (no en segundos) para
   que la cinta vaya al mismo ritmo sea cual sea la longitud del texto. */
const SPEED_PX_PER_SECOND = 70
const MOBILE_SPEED_PX_PER_SECOND = 65

function MarqueeGroup({
  phrases,
  repeats,
  hidden,
  groupRef,
}: {
  phrases: string[]
  repeats: number
  hidden?: boolean
  groupRef?: React.Ref<HTMLUListElement>
}) {
  return (
    <ul
      ref={groupRef}
      className="flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
    >
      {Array.from({ length: repeats }).flatMap((_, r) =>
        phrases.map((phrase, i) => (
          <li key={`${r}-${i}`} className="flex shrink-0 items-center">
            <span className="whitespace-nowrap px-5 text-xs font-black uppercase tracking-[0.18em] md:px-8 md:text-sm">
              {phrase}
            </span>
            {/* Separador entre frases */}
            <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-current opacity-50 md:h-2 md:w-2" />
          </li>
        ))
      )}
    </ul>
  )
}

/**
 * Cinta marquesina de la portada. El texto se administra desde el panel
 * (Sistema > Cinta marquesina) y se divide por "·" en frases.
 *
 * La pista contiene dos mitades identicas y se desplaza -50%, asi el bucle es
 * continuo y sin saltos. Cada mitad repite las frases las veces necesarias
 * para ser mas ancha que la cinta, de modo que nunca queda un hueco aunque el
 * texto sea corto. Colores invertidos (foreground/background) para que
 * contraste en ambos modos.
 */
export function BenefitsMarquee({ text }: { text: string }) {
  const phrases = splitMarqueeText(text)
  const sectionRef = useRef<HTMLElement>(null)
  const groupRef = useRef<HTMLUListElement>(null)
  const [repeats, setRepeats] = useState(3)
  const [duration, setDuration] = useState<number | null>(null)
  const textKey = phrases.join("\u0000")

  useLayoutEffect(() => {
    const section = sectionRef.current
    const group = groupRef.current
    if (!section || !group) return

    const measure = () => {
      const unitWidth = group.scrollWidth / repeats
      if (!unitWidth) return
      const needed = Math.max(1, Math.ceil(section.clientWidth / unitWidth))
      if (needed !== repeats) {
        setRepeats(needed)
        return
      }
      const speed =
        section.clientWidth < 768
          ? MOBILE_SPEED_PX_PER_SECOND
          : SPEED_PX_PER_SECOND
      setDuration(group.scrollWidth / speed)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(section)
    return () => observer.disconnect()
  }, [repeats, textKey])

  if (phrases.length === 0) return null

  return (
    <section
      ref={sectionRef}
      aria-label="Anuncios de StreetVibe"
      className="benefits-marquee relative w-full overflow-hidden bg-foreground py-3.5 text-background md:py-4"
    >
      {/* Lectores de pantalla: las frases una sola vez, sin la repeticion visual */}
      <ul className="sr-only">
        {phrases.map((phrase, i) => (
          <li key={i}>{phrase}</li>
        ))}
      </ul>

      <div
        className="benefits-marquee-track flex w-max"
        aria-hidden="true"
        style={
          duration
            ? ({ "--marquee-duration": `${duration}s` } as CSSProperties)
            : undefined
        }
      >
        <MarqueeGroup phrases={phrases} repeats={repeats} groupRef={groupRef} />
        <MarqueeGroup phrases={phrases} repeats={repeats} hidden />
      </div>
    </section>
  )
}
