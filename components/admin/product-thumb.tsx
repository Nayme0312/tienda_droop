import { VideoFrame } from '@/components/video-frame'
import { cn } from '@/lib/utils'
import type { AdminProduct } from '@/lib/admin/types'

/**
 * Miniatura de producto en el panel: la imagen principal; si el producto solo
 * tiene video, un fotograma del video; y si no tiene nada, el placeholder.
 */
export function ProductThumb({
  product,
  alt = product.name,
  className,
}: {
  product: Pick<AdminProduct, 'name' | 'mainImage' | 'video'>
  /** "" para miniaturas decorativas. */
  alt?: string
  className?: string
}) {
  if (!product.mainImage && product.video) {
    return (
      <VideoFrame
        src={product.video}
        label={alt || undefined}
        className={cn('shrink-0', className)}
      />
    )
  }
  return (
    <img
      src={product.mainImage || '/placeholder.svg'}
      alt={alt}
      loading="lazy"
      className={cn('shrink-0 object-cover', className)}
    />
  )
}
