import { loadHomeCatalog } from '@/lib/api/public-products'
import { loadMarqueeText } from '@/lib/marquee/load-marquee'
import { loadHeroMedia } from '@/lib/hero/load-hero'
import { loadTestimonials } from '@/lib/testimonials/load-testimonials'
import HomeClient from './home-client'

/**
 * Portada de la tienda.
 *
 * Server Component: lee de PostgreSQL las secciones visibles y sus productos.
 * Una seccion desactivada desde el panel no llega hasta aqui, asi que no se
 * renderiza ni aparece en el menu.
 *
 * `force-dynamic` es intencionado: activar o desactivar una seccion o una
 * promocion debe reflejarse al instante, y la vigencia de las promociones
 * depende de la fecha y hora de cada visita.
 */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [{ sections, productsBySlug }, marqueeText, heroMedia, testimonials] =
    await Promise.all([
      loadHomeCatalog(),
      loadMarqueeText(),
      loadHeroMedia(),
      loadTestimonials(),
    ])

  return (
    <HomeClient
      sections={sections}
      productsBySlug={productsBySlug}
      marqueeText={marqueeText}
      heroMedia={heroMedia}
      testimonials={testimonials}
    />
  )
}
