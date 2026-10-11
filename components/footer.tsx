"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Music, Facebook } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      {/* Newsletter */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl text-center"
        >
          <h3 className="mb-2 text-xl font-bold uppercase tracking-wider text-foreground">
            Unete al Movimiento
          </h3>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Recibe ofertas exclusivas, lanzamientos y contenido unico directo en tu correo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="tu@email.com"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50 transition-colors"
            />
            <button className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wider text-background shadow-lg shadow-black/10 transition-[translate,scale,opacity,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl active:translate-y-0 active:scale-[0.97]">
              Suscribir
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom */}
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-6">
          <Link href="/" className="text-base font-bold tracking-widest text-foreground uppercase border border-foreground/30 px-3 py-1.5 transition-colors duration-500 ease-out hover:border-foreground hover:bg-foreground hover:text-background">
            STREETVIBE
          </Link>

          <p className="text-xs text-muted-foreground">
            {"2024 STREETVIBE. Todos los derechos reservados."}
          </p>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="TikTok"
            >
              <Music className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
