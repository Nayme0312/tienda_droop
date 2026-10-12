'use client'

import { useState } from 'react'
import { StoreFloatingNavbar } from '@/components/store-floating-navbar'
import { HeroSection } from '@/components/hero-section'
import { CategorySection } from '@/components/product-card'
import { ProductModal } from '@/components/product-modal'
import { CartDrawer } from '@/components/cart-drawer'
import { BenefitsMarquee } from '@/components/benefits-marquee'
import { TestimonialsSection } from '@/components/testimonials-section'
import { Footer } from '@/components/footer'
import type { Product, StoreSection } from '@/lib/products'
import { sectionShortCopy } from '@/lib/sections'
import type { HeroMedia } from '@/lib/hero/hero'
import type { PublicTestimonial } from '@/lib/testimonials/testimonials'

/**
 * Parte interactiva de la portada. Las secciones llegan ya filtradas por
 * visibilidad desde el servidor: aqui solo se recorren.
 */
export default function HomeClient({
  sections,
  productsBySlug,
  marqueeText,
  heroMedia,
  testimonials,
}: {
  sections: StoreSection[]
  productsBySlug: Record<string, Product[]>
  /** Texto de la cinta marquesina; null si esta desactivada en el panel. */
  marqueeText: string | null
  /** Medio del Hero; null si esta desactivado en el panel. */
  heroMedia: HeroMedia | null
  /** Testimonios activos; vacio = la seccion no se muestra. */
  testimonials: PublicTestimonial[]
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <>
      {/* Solo la portada usa la barra flotante; el resto de paginas sigue con
          components/navbar.tsx */}
      <StoreFloatingNavbar sections={sections} />
      <main>
        {heroMedia ? (
          <HeroSection media={heroMedia} />
        ) : (
          // Sin Hero, el contenido arranca bajo el navbar fijo
          <div aria-hidden className="h-20" />
        )}
        {marqueeText && <BenefitsMarquee text={marqueeText} />}

        <div id="catalogo">
          {sections.map((section, index) => (
            <CategorySection
              key={section.slug}
              number={String(index + 1).padStart(2, '0')}
              title={section.label}
              // Descripcion editable en el panel; si esta vacia, el texto de
              // siempre de la seccion (lib/sections.ts)
              description={sectionShortCopy(section.slug, section.description)}
              href={section.href}
              ctaLabel={`Ver ${section.label}`}
              products={productsBySlug[section.slug] ?? []}
              onQuickView={setSelectedProduct}
            />
          ))}

          {sections.length === 0 && (
            <section className="py-24">
              <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
                  Catalogo en preparacion
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Estamos actualizando la tienda. Vuelve pronto para ver las
                  novedades.
                </p>
              </div>
            </section>
          )}
        </div>

        <TestimonialsSection testimonials={testimonials} />
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
