"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

export interface FloatingNavLink {
  label: string
  href: string
}

/**
 * Barra superior a todo el ancho con el menu central tipo "isla": pastilla
 * gris oscuro y el item activo en un bloque negro con relieve. El activo sale
 * de la ruta actual.
 *
 * - `logo`: contenido a la izquierda.
 * - `actions`: iconos a la derecha (buscador, tema, carrito...).
 * - `children`: contenido bajo la barra (buscador desplegable, adornos).
 */
export default function FloatingNavbar({
  logo,
  items,
  actions,
  children,
}: {
  logo: ReactNode
  items: FloatingNavLink[]
  actions?: ReactNode
  children?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-black transition-all duration-500 ${
        scrolled ? "border-b border-white/10 py-2.5" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        {logo}

        {/* Isla central */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-white/5 bg-neutral-900 p-1">
            {items.map((item) => {
              const active = item.href === pathname
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
                        : "block rounded-full px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1 min-[390px]:gap-3">
          {actions}

          {/* Boton de menu movil */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu movil: la misma isla, en vertical */}
      {open && (
        <nav className="mx-auto mt-3 max-w-7xl px-4 md:hidden">
          <ul className="flex flex-col gap-1 rounded-3xl border border-white/5 bg-neutral-900 p-1">
            {items.map((item) => {
              const active = item.href === pathname
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
                        : "block rounded-full px-5 py-3 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {children}
    </header>
  )
}
