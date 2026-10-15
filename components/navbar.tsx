"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ShoppingBag, Menu, X, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useCartStore } from "@/lib/cart-store"
import type { StoreSection } from "@/lib/products"
import { useStoreSeason } from "@/components/seasonal/season-provider"
import { ChristmasLights } from "@/components/seasonal/christmas"
import { NavbarSearch } from "@/components/navbar-search"

/**
 * `sections` son las secciones de tienda visibles, resueltas en el servidor a
 * partir de la base de datos. Si una categoria se desactiva desde el panel, su
 * enlace desaparece del menu (escritorio y movil) sin tocar este componente.
 */
export function Navbar({ sections = [] }: { sections?: StoreSection[] }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const cartCount = useCartStore((s) => s.totalItems())
  const openCart = useCartStore((s) => s.openCart)
  const season = useStoreSeason()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  const navLinks = [
    { href: "/", label: "Inicio" },
    ...sections.map((section) => ({
      href: section.href,
      label: section.label,
    })),
  ]

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-black border-b border-white/10 py-3"
            : // Negro fijo con texto blanco en ambos temas, tambien arriba del
              // todo; el scroll solo compacta y anade la linea inferior
              "bg-black py-5"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="relative z-50 shrink-0">
            <motion.span
              className="text-sm font-bold tracking-widest text-white uppercase border border-white/30 px-2.5 py-1 min-[390px]:text-lg min-[390px]:px-3 min-[390px]:py-1.5"
              whileHover={{ scale: 1.02 }}
            >
              STREETVIBE
            </motion.span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium uppercase tracking-wider text-white/70 transition-colors hover:text-white"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex shrink-0 items-center gap-1 min-[390px]:gap-3">
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
              {/* El carrito vive en localStorage (zustand/persist), asi que el
                  contador solo se renderiza despues del mount para que el HTML
                  del servidor y el primer render del cliente coincidan */}
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

            {/* Mobile Menu Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full p-2 text-white/70 transition-colors hover:text-white hover:bg-white/10 md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
                <NavbarSearch onSearched={() => setSearchOpen(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Fecha especial: luces bajo el menu */}
        {season === "navidad" && <ChristmasLights />}
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-background/98 backdrop-blur-xl md:hidden"
          >
            {/* safe center: si los enlaces no caben (movil en horizontal)
                se alinean arriba y se puede hacer scroll, en lugar de quedar
                cortados por encima */}
            <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto overscroll-contain px-6 py-24 [justify-content:safe_center]">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-3xl font-bold uppercase tracking-widest text-foreground transition-colors hover:text-foreground/70"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
