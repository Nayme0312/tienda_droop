"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { Product } from "@/lib/products"
import { categoryLabels, getEffectivePrice } from "@/lib/products"
import { formatPrice } from "@/lib/format"
import {
  STOCK_LIMIT_MESSAGE,
  remainingStock,
  useCartStore,
} from "@/lib/cart-store"
import { ImageZoom } from "@/components/image-zoom"
import { VideoFrame } from "@/components/video-frame"
import { StorePrice } from "@/components/store-price"

/** Elemento de la galeria: una imagen o el video del producto. */
type GalleryItem = { type: "image"; src: string } | { type: "video"; src: string }

/**
 * Galeria del modal: imagenes y video en una sola secuencia. El video va justo
 * despues de la imagen principal (o primero, si el producto no tiene fotos).
 */
function buildGallery(images: string[], video: string | null): GalleryItem[] {
  const items: GalleryItem[] = images.map((src) => ({ type: "image", src }))
  if (video) items.splice(Math.min(1, items.length), 0, { type: "video", src: video })
  return items
}

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined)
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoPaused, setVideoPaused] = useState(true)
  const [stockLimitHit, setStockLimitHit] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const cartItems = useCartStore((s) => s.items)
  // Unidades que aun se pueden anadir: stock menos lo que ya esta en el carrito.
  const available = product ? remainingStock(cartItems, product) : 0

  // Usa images[]; si un producto no la tiene (y tampoco video), cae a la
  // imagen unica de siempre
  const images = product
    ? product.images?.length || product.video
      ? product.images
      : [product.image]
    : []
  // `imageIndex` recorre la galeria completa (imagenes + video). El visor
  // ampliado solo recibe las imagenes, asi que se traduce entre ambos indices.
  const gallery = product ? buildGallery(images, product.video) : []
  const hasGallery = gallery.length > 1
  const current = gallery[imageIndex] ?? gallery[0]
  const imagePositions = gallery.flatMap((item, i) => (item.type === "image" ? [i] : []))

  useEffect(() => {
    setImageIndex(0)
    setZoomOpen(false)
    setVideoMuted(true)
    setQuantity(1)
    setStockLimitHit(false)
  }, [product?.id])

  useEffect(() => {
    if (gallery.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setImageIndex((i) => (i + 1) % gallery.length)
      } else if (e.key === "ArrowLeft") {
        setImageIndex((i) => (i - 1 + gallery.length) % gallery.length)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [gallery.length])

  if (!product || !current) return null

  const showImage = (i: number) => setImageIndex((i + gallery.length) % gallery.length)
  const openZoom = () => {
    if (current.type === "image") setZoomOpen(true)
  }

  const handleAdd = () => {
    if (!product.inStock) return
    const added = addItem(product, selectedSize, selectedColor, quantity)
    if (added === 0) {
      // Todo el stock ya esta en el carrito: se avisa aqui y no se cierra.
      setStockLimitHit(true)
      return
    }
    openCart()
    onClose()
  }

  const increaseQuantity = () => {
    if (quantity >= available) {
      setStockLimitHit(true)
      return
    }
    setQuantity(quantity + 1)
  }

  const handleWhatsApp = () => {
    const sizeText = selectedSize ? ` - Talla: ${selectedSize}` : ""
    const colorText = selectedColor ? ` - Color: ${selectedColor}` : ""
    // El importe sale del precio efectivo: si hay promocion vigente, el mensaje
    // lleva ya el precio con descuento y lo indica.
    const unitPrice = getEffectivePrice(product)
    const promoText = product.promotion
      ? `\n(Promocion "${product.promotion.name}": -${product.promotion.discountPercent}%)`
      : ""
    const message = `Hola, me interesa este producto:\n\n- ${product.name}${sizeText}${colorText} x${quantity}${promoText}\n\nTotal: ${formatPrice(unitPrice * quantity)}\n\nMe gustaria hacer el pedido.`
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, "_blank")
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-4xl max-h-[90svh] overflow-y-auto overscroll-contain rounded-2xl bg-card border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid md:grid-cols-2">
              {/* Galeria */}
              <div className="relative aspect-square overflow-hidden rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none bg-accent">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={imageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`absolute inset-0 ${current.type === "image" ? "cursor-zoom-in" : "bg-black"}`}
                    onClick={openZoom}
                  >
                    {current.type === "video" ? (
                      // Unico sitio donde el video se reproduce: al abrir el
                      // producto (o llegar a el en la galeria). Al cerrar el
                      // modal o cambiar de elemento se desmonta y se detiene.
                      // Silenciado + playsInline: es lo que permite la
                      // reproduccion automatica en moviles (iOS incluido).
                      // Tocar el video lo pausa o lo reanuda
                      <>
                        <video
                          src={current.src}
                          autoPlay
                          muted={videoMuted}
                          loop
                          playsInline
                          preload="metadata"
                          aria-label={`Video de ${product.name}`}
                          className="h-full w-full cursor-pointer object-contain"
                          onPlay={() => setVideoPaused(false)}
                          onPause={() => setVideoPaused(true)}
                          onClick={(e) => {
                            const v = e.currentTarget
                            if (v.paused) void v.play()
                            else v.pause()
                          }}
                        />
                        {/* En pausa (o si el navegador bloquea la
                            reproduccion automatica) se ve un boton grande,
                            comodo de tocar en movil */}
                        {videoPaused && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-xl backdrop-blur-sm"
                          >
                            <Play className="ml-1 h-7 w-7 fill-current" />
                          </span>
                        )}
                      </>
                    ) : (
                      <Image
                        src={current.src}
                        alt={
                          hasGallery
                            ? `${product.name} - imagen ${imageIndex + 1} de ${gallery.length}`
                            : product.name
                        }
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {product.badge && (
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                    {product.badge}
                  </div>
                )}

                {/* Afordancia de zoom: en tactil no hay cursor que lo indique.
                    En el video, el mismo hueco es el boton de sonido */}
                {current.type === "image" ? (
                  <button
                    onClick={openZoom}
                    className="absolute bottom-3 right-3 z-10 rounded-full bg-background/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground"
                    aria-label="Ampliar imagen"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setVideoMuted((m) => !m)}
                    className="absolute bottom-3 right-3 z-10 rounded-full bg-background/80 p-2.5 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground sm:p-2"
                    aria-label={videoMuted ? "Activar sonido" : "Silenciar video"}
                  >
                    {videoMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                )}

                {/* Controles: solo si la galeria tiene mas de un elemento */}
                {hasGallery && (
                  <>
                    <button
                      onClick={() => showImage(imageIndex - 1)}
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => showImage(imageIndex + 1)}
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:text-foreground"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Miniaturas: indican y permiten saltar a una imagen concreta */}
                    <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[90%] -translate-x-1/2 flex-wrap justify-center gap-2 rounded-xl bg-background/80 p-1.5 backdrop-blur-sm">
                      {gallery.map((item, i) => (
                        <button
                          key={`${item.src}-${i}`}
                          onClick={() => setImageIndex(i)}
                          aria-label={item.type === "video" ? "Ver video" : `Ver imagen ${i + 1}`}
                          aria-current={i === imageIndex}
                          className={`relative h-10 w-10 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                            i === imageIndex
                              ? "border-foreground"
                              : "border-transparent opacity-50 hover:opacity-100"
                          }`}
                        >
                          {item.type === "video" ? (
                            <>
                              <VideoFrame
                                src={item.src}
                                className="absolute inset-0 h-full w-full"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                                <Play className="h-4 w-4 fill-current" />
                              </span>
                            </>
                          ) : (
                            <Image
                              src={item.src}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {product.categoryLabel ?? categoryLabels[product.category] ?? product.category}
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">
                    {product.name}
                  </h2>
                  <StorePrice product={product} size="lg" className="mt-1" />
                  {product.promotion && (
                    <p className="mt-1.5 text-xs font-medium text-foreground/70">
                      Promocion: {product.promotion.name}
                    </p>
                  )}
                  {!product.inStock && (
                    <p className="mt-2 inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Agotado
                    </p>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>

                {/* Sizes */}
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Talla
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-11 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 sm:min-w-0 sm:py-2 ${
                            selectedSize === size
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-foreground/70 hover:border-foreground/50"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {product.colors && product.colors.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`rounded-lg border px-4 py-2.5 text-xs font-medium transition-all duration-200 sm:py-2 ${
                            selectedColor === color
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-foreground/70 hover:border-foreground/50"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                    Cantidad
                  </p>
                  <div className="flex w-fit items-center gap-3 rounded-lg border border-border px-1 py-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="rounded-md p-2.5 sm:p-1.5 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-foreground">
                      {quantity}
                    </span>
                    <button
                      onClick={increaseQuantity}
                      aria-label="Aumentar cantidad"
                      className={`rounded-md p-2.5 sm:p-1.5 transition-colors hover:bg-accent ${
                        quantity >= available
                          ? "text-foreground/30"
                          : "text-foreground/70 hover:text-foreground"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {product.inStock && stockLimitHit && (
                    <p role="status" className="mt-2 text-xs font-medium text-red-500">
                      {STOCK_LIMIT_MESSAGE}{" "}
                      <span className="font-normal text-muted-foreground">
                        {available > 0
                          ? `Puedes agregar hasta ${available}.`
                          : "Ya tienes todas en tu carrito."}
                      </span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={handleAdd}
                    disabled={!product.inStock}
                    className="flex items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold uppercase tracking-wider text-background transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {product.inStock ? "Agregar al Carrito" : "Agotado"}
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="flex items-center justify-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 py-3.5 text-sm font-semibold uppercase tracking-wider text-green-500 transition-all duration-300 hover:bg-green-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Comprar por WhatsApp
                  </button>
                </div>

                {/* Details Table: solo si el producto tiene ficha tecnica */}
                {Object.keys(product.details).length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                    Detalles del Producto
                  </p>
                  <div className="space-y-2">
                    {Object.entries(product.details).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <span className="text-muted-foreground shrink-0">{key}</span>
                        <span className="text-right font-medium text-foreground">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Visor ampliado: fuera del backdrop del modal para que sus clics
          no lleguen al onClick que cierra el producto */}
      <AnimatePresence>
        {zoomOpen && (
          <ImageZoom
            images={imagePositions.map((i) => gallery[i].src)}
            index={Math.max(0, imagePositions.indexOf(imageIndex))}
            alt={product.name}
            onIndexChange={(i) => setImageIndex(imagePositions[i] ?? 0)}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
