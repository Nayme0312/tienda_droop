"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Search, ShoppingBag, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import FloatingNavbar from "@/components/floating-navbar"
import { useCartStore } from "@/lib/cart-store"
import type { StoreSection } from "@/lib/products"
import { useStoreSeason } from "@/components/seasonal/season-provider"
import { ChristmasLights } from "@/components/seasonal/christmas"

/**
 * Barra de la portada: el menu central es la isla de FloatingNavbar y el resto
 * (logo, buscador, tema y carrito) es igual que en components/navbar.tsx.
 * Enlaces: Inicio + secciones visibles desde el panel.
 */
export function StoreFloatingNavbar({
  sections = [],
}: {
  sections?: StoreSection[]
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const cartCount = useCartStore((s) => s.totalItems())
  const openCart = useCartStore((s) => s.openCart)
  const season = useStoreSeason()

  useEffect(() => {
    setMounted(true)
  }, [])

  const links = [
    { href: "/", label: "Inicio" },
    ...sections.map((section) => ({
      href: section.href,
      label: section.label,
    })),
  ]

  return (
    <FloatingNavbar
      items={links}
      logo={
        <Link href="/" className="relative z-50 shrink-0">
          <motion.span
            className="text-sm font-bold tracking-widest text-white uppercase border border-white/30 px-2.5 py-1 min-[390px]:text-lg min-[390px]:px-3 min-[390px]:py-1.5"
            whileHover={{ scale: 1.02 }}
          >
            STREETVIBE
          </motion.span>
        </Link>
      }
      actions={
        <>
          {/* Search */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(!searchOpen)}
            className="relative rounded-full p-2 text-white/70 transition-colors hover:text-white hover:bg-white/10"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </motion.button>

          {/* Theme Toggle */}
          {mounted && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-white/70 transition-colors hover:text-white hover:bg-white/10"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </motion.button>
          )}

          {/* Cart */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={openCart}
            className="relative rounded-full p-2 text-white/70 transition-colors hover:text-white hover:bg-white/10"
            aria-label="Carrito de compras"
          >
            <ShoppingBag className="h-5 w-5" />
            {/* El carrito vive en localStorage: el contador solo se pinta tras
                el mount para que servidor y cliente coincidan */}
            {mounted && cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black"
              >
                {cartCount}
              </motion.span>
            )}
          </motion.button>
        </>
      }
    >
      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-white/10"
          >
            <div className="mx-auto max-w-7xl px-4 pt-3 md:px-6">
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Fecha especial: luces bajo el menu */}
      {season === "navidad" && <ChristmasLights />}
    </FloatingNavbar>
  )
}
