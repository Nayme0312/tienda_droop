"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { EASE_OUT, REVEAL_VIEWPORT } from "@/lib/motion"

const testimonials = [
  {
    name: "Carlos M.",
    text: "La calidad de las camisas es increible. El estampado no se desvanece y la tela es muy comoda. 100% recomendado.",
    rating: 5,
    product: "Camisa Chaos",
  },
  {
    name: "Sofia R.",
    text: "Las gorras son de primera. El bordado es impecable y se nota que es un producto premium. Ya tengo 3.",
    rating: 5,
    product: "Gorra LA",
  },
  {
    name: "Diego L.",
    text: "El envio fue super rapido y el empaque muy cuidado. La camisa oversize me quedo perfecta. Volvere a comprar.",
    rating: 5,
    product: "Camisa Freedom",
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Testimonios
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Lo Que Dicen
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={REVEAL_VIEWPORT}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: i * 0.12 }}
              className="group rounded-xl border border-border/50 bg-card/50 p-5 transition-[translate,border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-foreground/20 hover:bg-card hover:shadow-2xl hover:shadow-black/15 sm:p-6"
            >
              {/* Estrellas: entran una a una y "saltan" en cascada al hover */}
              <div className="mb-3 flex gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <motion.span
                    key={j}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.3 + i * 0.12 + j * 0.06 }}
                  >
                    <Star
                      style={{ transitionDelay: `${j * 40}ms` }}
                      className="h-4 w-4 fill-foreground/80 text-foreground/80 transition-[translate,fill,color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:fill-foreground group-hover:text-foreground"
                    />
                  </motion.span>
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-foreground/80">
                {`"${t.text}"`}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {t.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.product}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
