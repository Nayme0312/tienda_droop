import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/admin/format'
import type { AdminProduct } from '@/lib/admin/types'

/**
 * Precio de un producto en el panel.
 *
 * Un solo componente para los tres sitios donde aparece (tabla, tarjeta de movil
 * y dashboard), de modo que la forma de mostrar el descuento este definida una
 * sola vez.
 *
 * Prioridad de lo que se muestra:
 *   1. Si hay promocion vigente: precio promocional + original tachado + -X%.
 *      El original tachado es `price`, que nunca se modifica en la base de datos.
 *   2. Si no hay promocion pero si `oldPrice`: precio + precio anterior tachado.
 *   3. Si no hay ninguno: solo el precio.
 */
export function ProductPrice({
  product,
  className,
  align = 'start',
}: {
  product: Pick<
    AdminProduct,
    'price' | 'oldPrice' | 'discountedPrice' | 'promotion'
  >
  className?: string
  align?: 'start' | 'end'
}) {
  const promotion = product.promotion
  const hasPromotion = promotion !== null && product.discountedPrice !== null

  return (
    <span
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <span className="font-medium tabular-nums text-foreground">
        {formatPrice(hasPromotion ? product.discountedPrice! : product.price)}
      </span>

      {hasPromotion ? (
        <>
          <span className="text-xs tabular-nums text-muted-foreground line-through">
            {formatPrice(product.price)}
          </span>
          <span
            title={`Promocion: ${promotion!.name}`}
            className="inline-flex items-center rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-background"
          >
            {`-${promotion!.discountPercent}%`}
          </span>
        </>
      ) : (
        product.oldPrice !== null && (
          <span className="text-xs tabular-nums text-muted-foreground line-through">
            {formatPrice(product.oldPrice)}
          </span>
        )
      )}
    </span>
  )
}
