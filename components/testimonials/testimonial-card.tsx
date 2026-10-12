"use client"

import { useState } from "react"
import Image from "next/image"
import { BadgeCheck, Quote, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  TESTIMONIAL_RATING_MAX,
  formatRelativeDate,
  initialsOf,
  type PublicTestimonial,
} from "@/lib/testimonials/testimonials"

/**
 * Piezas visuales de un testimonio. Las usan la portada
 * (components/testimonials-section.tsx) y la vista previa del panel, para que
 * el administrador vea exactamente la tarjeta que se publicara.
 */

/** Dorado de las estrellas: unico acento de color sobre la paleta monocroma. */
const STAR_ON = "fill-amber-400 text-amber-400"
const STAR_OFF = "fill-foreground/10 text-foreground/15"

export function StarRating({
  rating,
  className,
  starClassName = "size-4",
}: {
  rating: number
  className?: string
  starClassName?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} de ${TESTIMONIAL_RATING_MAX} estrellas`}
    >
      {Array.from({ length: TESTIMONIAL_RATING_MAX }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          style={{ transitionDelay: `${i * 40}ms` }}
          className={cn(
            starClassName,
            "transition-transform duration-300 ease-out group-hover:-translate-y-0.5",
            i < rating ? STAR_ON : STAR_OFF,
          )}
        />
      ))}
    </div>
  )
}

export function TestimonialAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl: string | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = avatarUrl && !failed

  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-gradient-to-br from-foreground/25 to-foreground/5 ring-2 ring-background",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={avatarUrl}
          alt={`Foto de ${name}`}
          fill
          sizes="48px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden className="text-sm font-bold tracking-wide text-foreground">
          {initialsOf(name)}
        </span>
      )}
    </span>
  )
}

/** Comentarios mas largos que esto se recortan con "Leer mas". */
const CLAMP_AFTER_CHARS = 220

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Omit<PublicTestimonial, "id">
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = testimonial.comment.length > CLAMP_AFTER_CHARS

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-[translate,border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-foreground/20 hover:bg-card hover:shadow-2xl hover:shadow-black/30 sm:p-6",
        className,
      )}
    >
      {/* Comilla decorativa de fondo */}
      <Quote
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-2 size-24 rotate-180 text-foreground/[0.04] transition-colors duration-500 group-hover:text-foreground/[0.07]"
      />

      <header className="relative flex items-center gap-3">
        <TestimonialAvatar name={testimonial.customerName} avatarUrl={testimonial.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {testimonial.customerName}
            </h3>
            {testimonial.isVerified && (
              <BadgeCheck
                aria-label="Compra verificada"
                className="size-4 shrink-0 fill-foreground text-background"
              />
            )}
          </div>
          <time
            dateTime={testimonial.reviewedAt}
            title={new Date(testimonial.reviewedAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            // El texto relativo depende del reloj: puede diferir en un segundo
            // entre servidor y navegador.
            suppressHydrationWarning
            className="text-xs text-muted-foreground"
          >
            {formatRelativeDate(testimonial.reviewedAt)}
          </time>
        </div>
      </header>

      <div className="relative mt-4 flex items-center gap-2">
        <StarRating rating={testimonial.rating} />
        {testimonial.isVerified && (
          <span className="rounded-full border border-border/80 bg-background/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Compra verificada
          </span>
        )}
      </div>

      <p
        className={cn(
          "relative mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-foreground/80",
          isLong && !expanded && "line-clamp-5",
        )}
      >
        {testimonial.comment}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="relative mt-2 self-start text-xs font-semibold uppercase tracking-wider text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {expanded ? "Leer menos" : "Leer mas"}
        </button>
      )}

      {testimonial.productName && (
        <p className="relative mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          Compro: <span className="font-medium text-foreground/80">{testimonial.productName}</span>
        </p>
      )}
    </article>
  )
}
