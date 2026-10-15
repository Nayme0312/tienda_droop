"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Ruler, Search, SlidersHorizontal, X } from "lucide-react"
import {
  STANDARD_FITTED_CHART,
  formatCm,
  hasCapSize,
  parseCm,
  resolveHeadMeasure,
} from "@/lib/caps/size-chart"
import { Navbar } from "@/components/navbar"
import { ProductCard } from "@/components/product-card"
import { ProductModal } from "@/components/product-modal"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"
import { CapSizeCalculator } from "@/components/cap-size-calculator"
import type { Product, StoreSection } from "@/lib/products"
import { matchesSearch, searchTokens } from "@/lib/search"
import type { PublicCapType } from "@/lib/caps/cap-types"
import {
  EASE_OUT,
  drawLine,
  fadeRight,
  fadeUp,
  staggerContainer,
} from "@/lib/motion"

interface CatalogPageProps {
  /** Productos de la categoria, ya cargados de PostgreSQL por el servidor. */
  products: Product[]
  /** Secciones de tienda visibles, para el menu. */
  sections: StoreSection[]
  title: string
  description: string
  /**
   * Solo en la seccion Gorras: tipos activos. Con ellos el filtro principal
   * pasa a ser "Tipo de gorra" (sin ordenar por precio). Si alguno usa tallas
   * cerradas se ofrece ademas la Guia de tallas, que filtra por talla.
   */
  capTypes?: PublicCapType[]
}

/** Filtro de tipo de gorra sin seleccion ("" no es un slug valido). */
const ALL_CAP_TYPES = ""

/** Espera tras teclear la medida antes de filtrar (evita parpadeos con "57,"). */
const SIZE_FILTER_DELAY_MS = 350

/**
 * Gorras que la Guia de tallas muestra para una talla: de un tipo con tallas
 * cerradas, con stock y con esa talla entre las suyas.
 */
function capsInSize(products: Product[], size: string): Product[] {
  return products.filter(
    (p) => p.capType?.usesFittedSizes && p.inStock && hasCapSize(p.sizes, size)
  )
}

export function CatalogPage({
  products,
  sections,
  title,
  description,
  capTypes,
}: CatalogPageProps) {
  const isCaps = capTypes !== undefined
  const allProducts = products
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">(
    "default"
  )
  const [showFilters, setShowFilters] = useState(false)
  const [capType, setCapType] = useState(ALL_CAP_TYPES)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [headCm, setHeadCm] = useState("")
  const [appliedSize, setAppliedSize] = useState<string | null>(null)

  // La guia existe solo si algun tipo ACTIVO usa tallas cerradas: desactivar
  // "Cerrada" en el panel la quita de la tienda.
  const showGuideButton =
    isCaps && capTypes.some((type) => type.usesFittedSizes)

  // Talla de la medida que se esta escribiendo; se aplica al filtro con una
  // pequena espera.
  const liveSize = useMemo(() => {
    const measure = resolveHeadMeasure(headCm, STANDARD_FITTED_CHART)
    return measure.kind === "measured" && measure.result.kind === "match"
      ? measure.result.size.label
      : null
  }, [headCm])

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSize(liveSize), SIZE_FILTER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [liveSize])

  const sizeActive = showGuideButton && appliedSize !== null
  const headCmValue = parseCm(headCm)

  /** Quita el filtro de talla y vuelve a todas las gorras. */
  const clearSizeFilter = () => {
    setHeadCm("")
    setAppliedSize(null)
  }

  const filtered = useMemo(() => {
    const tokens = searchTokens(search)
    let result = allProducts.filter((p) => matchesSearch(p, tokens))
    if (isCaps) {
      // Con la guia aplicada manda la talla, no el tipo elegido.
      if (sizeActive && appliedSize) return capsInSize(result, appliedSize)
      if (capType !== ALL_CAP_TYPES) {
        result = result.filter((p) => p.capType?.slug === capType)
      }
      return result
    }
    if (sortBy === "price-asc") result = [...result].sort((a, b) => a.price - b.price)
    if (sortBy === "price-desc") result = [...result].sort((a, b) => b.price - a.price)
    return result
  }, [allProducts, search, sortBy, isCaps, capType, sizeActive, appliedSize])

  return (
    <>
      <Navbar sections={sections} />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          {/* Header */}
          <motion.div
            variants={staggerContainer(0.1, 0.1)}
            initial="hidden"
            animate="show"
            className="mb-10"
          >
            <motion.div variants={fadeRight} className="mb-2 flex items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Catalogo
              </p>
              <motion.span
                variants={drawLine}
                className="h-px w-10 origin-left bg-foreground/30"
              />
            </motion.div>
            {/* El titulo sube desde detras de una mascara */}
            <div className="overflow-hidden pb-1">
              <motion.h1
                variants={{
                  hidden: { y: "105%" },
                  show: { y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
                }}
                className="text-4xl font-black uppercase tracking-tight text-foreground md:text-6xl"
              >
                {title}
              </motion.h1>
            </div>
            <motion.p
              variants={fadeUp}
              className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground"
            >
              {description}
            </motion.p>
          </motion.div>

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: EASE_OUT }}
            className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isCaps ? (
              /* Gorras: guia de tallas en lugar de filtros y orden */
              showGuideButton && (
                <button
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  aria-expanded={showSizeGuide}
                  // Naranja con texto casi negro (contraste ~7:1) en ambos modos.
                  // Rebote, pulso y hover viven en .size-guide-cta (globals.css).
                  className={`size-guide-cta group/guide flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 md:self-auto ${
                    showSizeGuide
                      ? "border-orange-600 bg-orange-600"
                      : "border-orange-500 bg-orange-500 hover:border-orange-400 hover:bg-orange-400"
                  }`}
                >
                  <Ruler className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover/guide:-rotate-12 group-hover/guide:scale-110" />
                  Guia de tallas
                </button>
              )
            ) : (
              /* Filters Toggle + Sort */
              <div className="flex w-full items-center gap-3 md:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                    showFilters
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground/70 hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground"
                  } group/filter duration-300 active:scale-[0.97]`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover/filter:rotate-90" />
                  Filtros
                </button>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as typeof sortBy)
                  }
                  // En movil la fuente sube a 16px (ver globals.css): sin
                  // tracking para que "Destacados" no se corte a 320px
                  className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-normal md:tracking-wider text-foreground/70 outline-none focus:border-foreground/40 transition-colors md:flex-none"
                >
                  <option value="default">Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                </select>
              </div>
            )}
          </motion.div>

          {/* Gorras: filtro principal por tipo */}
          {isCaps && capTypes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: EASE_OUT }}
              className="mb-8"
            >
              <p
                id="cap-type-filter-label"
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Tipo de gorra
              </p>
              <div
                role="group"
                aria-labelledby="cap-type-filter-label"
                className="flex flex-wrap gap-2"
              >
                {[{ slug: ALL_CAP_TYPES, name: "Todas" }, ...capTypes].map(
                  (type) => {
                    const active = !sizeActive && capType === type.slug
                    return (
                      <button
                        key={type.slug}
                        onClick={() => {
                          clearSizeFilter()
                          setCapType(type.slug)
                        }}
                        aria-pressed={active}
                        className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 active:scale-[0.97] ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-foreground/70 hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {type.name}
                      </button>
                    )
                  }
                )}
              </div>
            </motion.div>
          )}

          {/* Gorras: calculadora de talla */}
          <AnimatePresence>
            {showGuideButton && showSizeGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <CapSizeCalculator
                  value={headCm}
                  onValueChange={setHeadCm}
                  matchCount={
                    liveSize ? capsInSize(allProducts, liveSize).length : null
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gorras: resultado de la guia de tallas */}
          <AnimatePresence>
            {sizeActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="mb-6 flex flex-col gap-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
              >
                <div>
                  <p className="text-lg font-black uppercase tracking-tight text-foreground md:text-xl">
                    Gorras con tu talla
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Talla{" "}
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {appliedSize}
                    </span>
                    {headCmValue !== null && ` · ${formatCm(headCmValue)} cm`}
                    {" · "}
                    {filtered.length}{" "}
                    {filtered.length === 1
                      ? "gorra cerrada disponible"
                      : "gorras cerradas disponibles"}
                  </p>
                </div>
                <button
                  onClick={clearSizeFilter}
                  className="flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/40 active:scale-[0.97] sm:self-auto"
                >
                  <X className="h-3.5 w-3.5" />
                  Ver todas las gorras
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters Panel */}
          <AnimatePresence>
            {!isCaps && showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden rounded-xl border border-border bg-card/50 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                  Rango de Precio
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Todos", "$0-$20", "$20-$25", "$25+"].map((label) => (
                    <button
                      key={label}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground active:scale-[0.97]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <p className="mb-6 text-xs text-muted-foreground">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          </p>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onQuickView={setSelectedProduct}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-semibold text-foreground/60">
                No se encontraron productos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sizeActive
                  ? "Por ahora no hay gorras cerradas disponibles en tu talla"
                  : isCaps && capType !== ALL_CAP_TYPES
                    ? "Prueba con otro tipo de gorra o con otra busqueda"
                    : "Intenta con otra busqueda"}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  )
}
