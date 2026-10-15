"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Play, ShoppingBag, Snowflake, Sparkles } from "lucide-react"
import type { Product } from "@/lib/products"
import { hasPromotion } from "@/lib/products"
import { useCartStore } from "@/lib/cart-store"
import { StorePrice } from "@/components/store-price"
import { VideoFrame } from "@/components/video-frame"
import { useStoreSeason } from "@/components/seasonal/season-provider"
import { SantaHat } from "@/components/seasonal/christmas"
import { cn } from "@/lib/utils"
import {
  EASE_OUT,
  REVEAL_VIEWPORT,
  drawLine,
  fadeRight,
  fadeUp,
  layoutTransition,
  staggerContainer,
} from "@/lib/motion"

interface ProductCardProps {
  product: Product
  index: number
  onQuickView: (product: Product) => void
}

export function ProductCard({ product, index, onQuickView }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const season = useStoreSeason()
  const isChristmas = season === "navidad"
  // Un solo gorro: en la tercera tarjeta de la seccion de camisas.
  const wearsSantaHat =
    isChristmas && product.category === "camisas" && index === 2

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!product.inStock) return
    const defaultSize = product.sizes?.[1] || undefined
    const defaultColor = product.colors?.[0] || undefined
    // Si ya no quedan unidades, el carrito se abre con el aviso de stock.
    addItem(product, defaultSize, defaultColor)
    openCart()
  }

  return (
    <motion.div
      // `layout` anima la recolocacion al ordenar/filtrar en el catalogo
      layout
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      // El retardo se reinicia cada fila (index % 4) para que en catalogos
      // largos las ultimas tarjetas no tarden segundos en aparecer
      transition={{
        duration: 0.7,
        ease: EASE_OUT,
        delay: (index % 4) * 0.08,
        layout: layoutTransition,
      }}
      className="group relative cursor-pointer"
      onClick={() => onQuickView(product)}
    >
      {/* Fecha especial: gorro apoyado en la esquina. Fuera del contenedor de
          la imagen (que recorta con overflow-hidden) y con la misma elevacion
          que la tarjeta al pasar el mouse */}
      {wearsSantaHat && (
        <SantaHat className="absolute -right-2.5 -top-5 z-10 w-10 rotate-[18deg] transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 sm:-right-3 sm:-top-6 sm:w-12" />
      )}
      {/* Hover (solo dispositivos con puntero): la tarjeta se eleva con
          sombra, la foto hace un zoom lento y cruza un destello */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/0 transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-black/25 group-hover:ring-foreground/10">
        {/* Producto solo con video: la tarjeta muestra un fotograma fijo del
            video (nunca se reproduce aqui; solo al abrir el producto), con el
            mismo encuadre y zoom que la foto */}
        {product.images.length === 0 && product.video ? (
          <>
            <VideoFrame
              src={product.video}
              label={product.name}
              className="absolute inset-0 h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur-sm transition-transform duration-500 group-hover:scale-110"
            >
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </>
        ) : (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Overlay: en movil siempre visible porque no existe hover tactil */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100" />

        {/* Destello diagonal que cruza la imagen al pasar el mouse */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-full w-full bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] transition-transform duration-1000 ease-out group-hover:translate-x-[200%] motion-reduce:hidden"
        />

        {/* Etiquetas en una fila: descuento y badge a la izquierda, Agotado a
            la derecha. Con flex-wrap, en tarjetas estrechas (2 columnas en
            movil) Agotado baja de linea en vez de montarse sobre el badge */}
        <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1.5 sm:inset-x-3 sm:top-3">
          {/* Etiquetas: descuento a la izquierda, badge del producto debajo */}
          <div className="flex flex-col items-start gap-2">
            {hasPromotion(product) && (
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                  isChristmas
                    ? "bg-[#c8102e] text-white"
                    : "bg-foreground text-background",
                )}
              >
                {`-${product.promotion!.discountPercent}%`}
              </div>
            )}
            {product.badge && (
              <div className="rounded-full bg-background/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
                {product.badge}
              </div>
            )}
          </div>

          {/* Agotado */}
          {!product.inStock && (
            <div className="ml-auto rounded-full bg-background/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              Agotado
            </div>
          )}
        </div>

        {/* Quick actions: en movil siempre visibles (sin hover no serian accesibles) */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="group/btn flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-xs font-semibold uppercase tracking-wider text-background shadow-lg shadow-black/20 transition-[translate,scale,background-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-xl active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-foreground md:py-2.5"
          >
            <ShoppingBag className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-enabled/btn:group-hover/btn:-rotate-12 group-enabled/btn:group-hover/btn:scale-110" />
            {product.inStock ? "Agregar" : "Agotado"}
          </button>
        </div>
      </div>

      {/* Info: el nombre se subraya de izquierda a derecha al pasar el mouse */}
      <div className="mt-3 space-y-1">
        {/* Referencia en la esquina, pequena y atenuada para no competir con
            el nombre; es la que el cliente ve repetida en WhatsApp */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-foreground sm:text-sm">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]">
              {product.name}
            </span>
          </h3>
          {product.code ? (
            <span className="shrink-0 text-[10px] tabular-nums tracking-wider text-muted-foreground/70">
              Ref. {product.code}
            </span>
          ) : null}
        </div>
        <StorePrice product={product} />
      </div>
    </motion.div>
  )
}

interface CategorySectionProps {
  number: string
  title: string
  description: string
  href: string
  ctaLabel: string
  products: Product[]
  onQuickView: (product: Product) => void
}

export function CategorySection({
  number,
  title,
  description,
  href,
  ctaLabel,
  products,
  onQuickView,
}: CategorySectionProps) {
  const season = useStoreSeason()

  return (
    <section className="py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* La columna lateral solo aparece en lg: en tablet dejaria las tarjetas a ~114px */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
          {/* Left Label */}
          {/* Entrada escalonada: numero y linea, titulo, texto y boton */}
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={REVEAL_VIEWPORT}
            className="group/label flex flex-col justify-center"
          >
            <motion.div variants={fadeRight} className="mb-4 flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground transition-colors duration-500 group-hover/label:text-foreground">
                {number}
              </span>
              {season === "navidad" && (
                <Snowflake
                  aria-hidden
                  className="h-3.5 w-3.5 text-[#c8102e]"
                />
              )}
              <motion.div
                variants={drawLine}
                className="h-px w-12 origin-left bg-foreground/30 transition-[width,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/label:w-20 group-hover/label:bg-foreground/70"
              />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mb-3 text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl"
            >
              <span className="inline-block transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-1.5">
                {title}
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mb-6 text-sm leading-relaxed text-muted-foreground"
            >
              {description}
            </motion.p>
            <motion.div variants={fadeUp}>
              {/* Relleno que entra desde la izquierda en lugar de un cambio
                  de color instantaneo */}
              <Link
                href={href}
                className="group relative isolate flex w-fit items-center gap-3 overflow-hidden border border-foreground/30 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-[color,border-color,scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-foreground before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground hover:text-background hover:before:scale-x-100 active:scale-[0.97] sm:py-3"
              >
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Product Grid: los productos destacados desde el panel. Sin
              destacados, un estado vacio que invita a ver toda la seccion */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
            {products.length === 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={REVEAL_VIEWPORT}
                className="col-span-full flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-card/30 px-6 py-12 text-center backdrop-blur-[2px] md:min-h-80"
              >
                <Sparkles className="mb-4 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  Muy pronto
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Estamos eligiendo los destacados de {title.toLowerCase()}.
                  Mientras tanto, descubre todo el catálogo.
                </p>
                <Link
                  href={href}
                  className="group mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground underline-offset-4 hover:underline"
                >
                  {ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
            )}
            {products.slice(0, 3).map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
