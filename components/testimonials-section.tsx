"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { StarRating, TestimonialCard } from "@/components/testimonials/testimonial-card"
import { cn } from "@/lib/utils"
import { EASE_OUT, REVEAL_VIEWPORT } from "@/lib/motion"
import type { PublicTestimonial } from "@/lib/testimonials/testimonials"

/** Avance automatico del carrusel. */
const AUTOPLAY_MS = 6000

/**
 * Seccion "Lo Que Dicen" de la portada.
 *
 * Los testimonios salen de PostgreSQL y se gestionan en el panel
 * (Sistema > Testimonios). Si no hay ninguno activo, la seccion no se muestra.
 *
 * Carrusel con avance automatico que se pausa al pasar el raton o enfocar una
 * tarjeta, y que no avanza solo si el usuario prefiere movimiento reducido.
 */
export function TestimonialsSection({
  testimonials,
}: {
  testimonials: PublicTestimonial[]
}) {
  const reduceMotion = useReducedMotion()
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [paused, setPaused] = useState(false)

  const onSelect = useCallback((carousel: NonNullable<CarouselApi>) => {
    setSelected(carousel.selectedScrollSnap())
    setSnapCount(carousel.scrollSnapList().length)
  }, [])

  useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("select", onSelect)
    api.on("reInit", onSelect)
    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api, onSelect])

  useEffect(() => {
    if (!api || paused || reduceMotion || snapCount <= 1) return
    // Sin bucle (pocos testimonios), al llegar al final vuelve al principio.
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext()
      else api.scrollTo(0)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [api, paused, reduceMotion, snapCount])

  if (testimonials.length === 0) return null

  const average =
    testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
  const verifiedCount = testimonials.filter((t) => t.isVerified).length

  return (
    <section className="py-12 md:py-24" aria-labelledby="testimonios-titulo">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-10 flex flex-col items-center gap-6 text-center md:mb-12 md:flex-row md:items-end md:justify-between md:text-left"
        >
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Testimonios
            </p>
            <h2
              id="testimonios-titulo"
              className="text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl"
            >
              Lo Que Dicen
            </h2>
          </div>

          {/* Resumen de calificaciones */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 px-5 py-3">
            <span className="text-3xl font-black tabular-nums text-foreground">
              {average.toFixed(1)}
            </span>
            <div className="text-left">
              <StarRating rating={Math.round(average)} starClassName="size-4" />
              <p className="mt-1 text-xs text-muted-foreground">
                {testimonials.length}{" "}
                {testimonials.length === 1 ? "resena" : "resenas"}
                {verifiedCount > 0 &&
                  ` · ${verifiedCount} ${verifiedCount === 1 ? "verificada" : "verificadas"}`}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <Carousel
            setApi={setApi}
            opts={{ align: "start", loop: testimonials.length > 3 }}
            aria-label="Testimonios de clientes"
          >
            {/* py/-my: espacio para la sombra y el desplazamiento del hover */}
            <CarouselContent className="-my-4 py-4">
              {testimonials.map((testimonial) => (
                <CarouselItem
                  key={testimonial.id}
                  className="basis-[88%] sm:basis-1/2 lg:basis-1/3"
                >
                  <TestimonialCard testimonial={testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {snapCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 md:justify-between">
              <div className="hidden items-center gap-1.5 md:flex" aria-hidden>
                {Array.from({ length: snapCount }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500 ease-out",
                      i === selected ? "w-8 bg-foreground" : "w-3 bg-foreground/20",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <CarouselButton
                  label="Testimonio anterior"
                  onClick={() => api?.scrollPrev()}
                  disabled={!api?.canScrollPrev()}
                >
                  <ChevronLeft className="size-5" />
                </CarouselButton>
                <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground md:hidden">
                  {selected + 1} / {snapCount}
                </span>
                <CarouselButton
                  label="Siguiente testimonio"
                  onClick={() => api?.scrollNext()}
                  disabled={!api?.canScrollNext()}
                >
                  <ChevronRight className="size-5" />
                </CarouselButton>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

function CarouselButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-card/60 text-foreground transition-[translate,background-color,border-color,opacity] duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-card active:translate-y-0 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
