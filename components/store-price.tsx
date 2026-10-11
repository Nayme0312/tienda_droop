"use client"

import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format"
import { getEffectivePrice, hasPromotion, type Product } from "@/lib/products"

/**
 * Precio de un producto en la tienda publica.
 *
 * Un solo componente para la tarjeta y el modal, de modo que el descuento se
 * presente igual en los dos sitios.
 *
 * Si hay promocion vigente: precio con descuento + precio ORIGINAL tachado +
 * porcentaje. El tachado es el `price` de la base de datos, que nunca se
 * modifica. Si no hay promocion, se muestra el precio normal (y el precio
 * anterior tachado, si el producto tiene uno).
 */
export function StorePrice({
  product,
  size = "md",
  className,
}: {
  product: Product
  size?: "md" | "lg"
  className?: string
}) {
  const promo = hasPromotion(product)
  const effective = getEffectivePrice(product)

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-bold tabular-nums text-foreground",
          size === "lg" ? "text-2xl" : "text-sm font-medium",
        )}
      >
        {formatPrice(effective)}
      </span>

      {promo ? (
        <>
          <span
            className={cn(
              "tabular-nums text-muted-foreground line-through",
              size === "lg" ? "text-base" : "text-xs",
            )}
          >
            {formatPrice(product.price)}
          </span>
          {/* El porcentaje se interpola como un unico texto: con
              `-{pct}%` React generaria tres nodos separados por comentarios
              en el HTML del servidor. */}
          <span
            className={cn(
              "inline-flex items-center rounded bg-foreground font-bold tabular-nums text-background",
              size === "lg"
                ? "px-2 py-0.5 text-xs"
                : "px-1.5 py-0.5 text-[10px]",
            )}
          >
            {`-${product.promotion!.discountPercent}%`}
          </span>
        </>
      ) : (
        product.oldPrice !== null && (
          <span
            className={cn(
              "tabular-nums text-muted-foreground line-through",
              size === "lg" ? "text-base" : "text-xs",
            )}
          >
            {formatPrice(product.oldPrice)}
          </span>
        )
      )}
    </div>
  )
}
