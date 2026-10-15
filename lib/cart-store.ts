"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "@/lib/products"
import { getEffectivePrice } from "@/lib/products"

export interface CartItem {
  product: Product
  quantity: number
  size?: string
  color?: string
}

/** Mensaje que muestra la tienda al intentar superar el stock. */
export const STOCK_LIMIT_MESSAGE = "No hay más unidades disponibles."

/**
 * Unidades de un producto que ya hay en el carrito, sumando todas sus tallas:
 * el stock es por producto, no por talla (igual que valida el servidor en
 * lib/checkout/pricing.ts).
 */
export function unitsInCart(items: CartItem[], productId: string): number {
  return items.reduce(
    (acc, item) => (item.product.id === productId ? acc + item.quantity : acc),
    0
  )
}

/** Unidades que todavia se pueden anadir de un producto. */
export function remainingStock(items: CartItem[], product: Product): number {
  return Math.max(0, product.stock - unitsInCart(items, product.id))
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  /** Aviso de stock para el carrito (no se guarda en localStorage). */
  stockNotice: string | null
  /**
   * Anade `quantity` unidades sin superar el stock. Devuelve las que se
   * anadieron de verdad (0 si ya no quedaban); si se recorta, deja el aviso
   * en `stockNotice`.
   */
  addItem: (
    product: Product,
    size?: string,
    color?: string,
    quantity?: number
  ) => number
  removeItem: (productId: string, size?: string) => void
  /** Cambia la cantidad sin superar el stock; si se recorta, deja el aviso. */
  updateQuantity: (productId: string, quantity: number, size?: string) => void
  clearStockNotice: () => void
  /**
   * Completa la referencia (code) de los productos guardados en el carrito
   * antes de que la tienda la enviara. `codes` va de id de producto a codigo.
   */
  setProductCodes: (codes: Map<string, number>) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      stockNotice: null,

      addItem: (product, size, color, quantity = 1) => {
        const items = get().items
        const added = Math.min(quantity, remainingStock(items, product))
        if (added < quantity) set({ stockNotice: STOCK_LIMIT_MESSAGE })
        if (added <= 0) return 0

        const existingIndex = items.findIndex(
          (item) => item.product.id === product.id && item.size === size
        )

        if (existingIndex >= 0) {
          // Se guarda el producto recien cargado: asi el carrito usa el stock
          // mas reciente que conoce la tienda.
          set({
            items: items.map((item, i) =>
              i === existingIndex
                ? { ...item, product, quantity: item.quantity + added }
                : item
            ),
          })
        } else {
          set({ items: [...items, { product, quantity: added, size, color }] })
        }
        return added
      },

      removeItem: (productId, size) => {
        set({
          items: get().items.filter(
            (item) =>
              !(item.product.id === productId && item.size === size)
          ),
        })
      },

      updateQuantity: (productId, quantity, size) => {
        if (quantity <= 0) {
          get().removeItem(productId, size)
          return
        }
        const items = get().items
        const line = items.find(
          (item) => item.product.id === productId && item.size === size
        )
        if (!line) return

        // Lo que permite el stock para esta linea: el total menos lo que
        // ocupan las otras tallas del mismo producto.
        const maxForLine = line.quantity + remainingStock(items, line.product)
        const next = Math.min(quantity, maxForLine)
        if (next < quantity) set({ stockNotice: STOCK_LIMIT_MESSAGE })
        if (next === line.quantity) return

        set({
          items: items.map((item) =>
            item === line ? { ...item, quantity: next } : item
          ),
        })
      },

      clearStockNotice: () => set({ stockNotice: null }),

      setProductCodes: (codes) => {
        set({
          items: get().items.map((item) => {
            const code = codes.get(item.product.id)
            return item.product.code || code === undefined
              ? item
              : { ...item, product: { ...item.product, code } }
          }),
        })
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () =>
        get().items.reduce((acc, item) => acc + item.quantity, 0),

      // Se suma el precio efectivo (el promocional si el producto tenia una
      // promocion vigente al anadirlo), no el precio original.
      totalPrice: () =>
        get().items.reduce(
          (acc, item) => acc + getEffectivePrice(item.product) * item.quantity,
          0
        ),
    }),
    {
      name: "streetvibe-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
)
