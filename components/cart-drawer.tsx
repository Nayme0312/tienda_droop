"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minus, Plus, ShoppingBag, MessageCircle, Trash2, CreditCard } from "lucide-react"
import { remainingStock, useCartStore } from "@/lib/cart-store"
import { getEffectivePrice, hasPromotion, whatsappRef } from "@/lib/products"
import type { Product } from "@/lib/products"
import { API_ROUTES, api } from "@/lib/api/client"
import { formatPrice } from "@/lib/format"
import { VideoFrame } from "@/components/video-frame"

/** Tiempo que el aviso de stock queda visible en el carrito. */
const STOCK_NOTICE_MS = 3500

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totalPrice,
    clearCart,
    stockNotice,
    clearStockNotice,
    setProductCodes,
  } = useCartStore()

  // Un carrito guardado antes de que existiera la referencia no la tiene: al
  // abrirlo se completa con el catalogo para que el mensaje de WhatsApp la
  // lleve. Si falla, el mensaje sale igual, sin referencia.
  const missingCodes = isOpen && items.some((item) => !item.product.code)
  useEffect(() => {
    if (!missingCodes) return
    let active = true
    api
      .get<Product[]>(API_ROUTES.publicProducts)
      .then((products) => {
        if (active) setProductCodes(new Map(products.map((p) => [p.id, p.code])))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [missingCodes, setProductCodes])

  // El aviso de stock desaparece solo; al cerrar el carrito, al instante.
  useEffect(() => {
    if (!stockNotice) return
    if (!isOpen) {
      clearStockNotice()
      return
    }
    const timer = setTimeout(clearStockNotice, STOCK_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [stockNotice, isOpen, clearStockNotice])

  const handleWhatsAppOrder = () => {
    if (items.length === 0) return

    const itemLines = items.map((item) => {
      const sizeText = item.size ? ` ${item.size}` : ""
      const colorText = item.color ? ` ${item.color}` : ""
      return `• ${item.product.name}${sizeText}${colorText}${whatsappRef(item.product)} x${item.quantity}`
    })

    const message = `Hola, quiero confirmar este pedido:\n\n${itemLines.join("\n")}\n\nTotal: ${formatPrice(totalPrice())}`
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, "_blank")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[70] bg-background/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">
                  Tu Carrito
                </h2>
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <button
                onClick={closeCart}
                className="rounded-full p-2 text-foreground/60 transition-colors hover:text-foreground hover:bg-accent"
                aria-label="Cerrar carrito"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aviso de stock: al intentar superar las unidades disponibles */}
            <AnimatePresence>
              {stockNotice && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-500 sm:px-6"
                >
                  {stockNotice}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Tu carrito esta vacio
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-accent"
                  >
                    Seguir Comprando
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.size}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      className="flex gap-3 rounded-xl border border-border/50 bg-accent/30 p-3 sm:gap-4"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-accent sm:h-20 sm:w-20">
                        {/* Producto solo con video: fotograma fijo del video */}
                        {item.product.images.length === 0 && item.product.video ? (
                          <VideoFrame
                            src={item.product.video}
                            label={item.product.name}
                            className="absolute inset-0 h-full w-full"
                          />
                        ) : (
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 64px, 80px"
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground break-words">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground break-words">
                            {item.size && `Talla: ${item.size}`}
                            {item.size && item.color && " / "}
                            {item.color && `Color: ${item.color}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 rounded-lg border border-border px-1 py-0.5">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                  item.size
                                )
                              }
                              className="p-2 text-foreground/60 hover:text-foreground sm:p-1"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                  item.size
                                )
                              }
                              aria-label="Aumentar cantidad"
                              // Atenuado al llegar al stock; al pulsarlo igual,
                              // el carrito muestra el aviso
                              className={`p-2 sm:p-1 ${
                                remainingStock(items, item.product) === 0
                                  ? "text-foreground/25"
                                  : "text-foreground/60 hover:text-foreground"
                              }`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">
                              {formatPrice(
                                getEffectivePrice(item.product) * item.quantity
                              )}
                            </p>
                            {hasPromotion(item.product) && (
                              <p className="text-[10px] font-medium text-muted-foreground line-through">
                                {formatPrice(
                                  item.product.price * item.quantity
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.size)}
                        className="self-start p-2 text-muted-foreground/50 transition-colors hover:text-destructive sm:p-1"
                        aria-label={`Eliminar ${item.product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-4 py-4 space-y-4 sm:px-6 sm:py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(totalPrice())}
                  </span>
                </div>
                {/* Pago en linea: el total definitivo lo calcula el servidor
                    en /checkout antes de redirigir a Wompi */}
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold uppercase tracking-wider text-background transition-all duration-300 hover:bg-foreground/90"
                >
                  <CreditCard className="h-4 w-4" />
                  Pagar con Wompi
                </Link>
                <button
                  onClick={handleWhatsAppOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Confirmar por WhatsApp
                </button>
                <button
                  onClick={clearCart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
                >
                  Vaciar Carrito
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
