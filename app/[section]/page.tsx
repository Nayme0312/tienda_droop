import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  loadPublicCapTypes,
  loadPublicProducts,
  loadVisibleSection,
  loadVisibleSections,
} from "@/lib/api/public-products"
import { sectionLongCopy, sectionMetaDescription } from "@/lib/sections"
import { isCapSection } from "@/lib/caps/cap-types"
import SectionClient from "./section-client"

type PageProps = { params: Promise<{ section: string }> }

// Sin cache: las promociones y la visibilidad de las secciones deben reflejarse
// al instante, y la vigencia de una promocion depende de la fecha de la visita.
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section: slug } = await params
  const section = await loadVisibleSection(slug)
  if (!section) return {}
  return {
    title: `${section.name} | STREETVIBE`,
    description: sectionMetaDescription(
      section.slug,
      section.name,
      section.description,
    ),
  }
}

/**
 * Pagina publica de una seccion de tienda (/camisas, /gorras, /pines y las que
 * se creen desde el panel). Las rutas fijas de la tienda (/checkout, /api...)
 * tienen prioridad sobre esta y la API no deja crear secciones con esos
 * nombres.
 */
export default async function SectionPage({ params }: PageProps) {
  const { section: slug } = await params

  // Si la seccion no existe o esta desactivada desde el panel, la pagina no
  // existe para el cliente aunque escriba la URL a mano.
  const section = await loadVisibleSection(slug)
  if (!section) notFound()

  // Gorras: sus tipos activos son el filtro principal de la seccion.
  const isCaps = isCapSection(section.slug)
  const [products, sections, capTypes] = await Promise.all([
    loadPublicProducts(section.slug),
    loadVisibleSections(),
    isCaps ? loadPublicCapTypes() : undefined,
  ])

  return (
    <SectionClient
      products={products}
      sections={sections}
      title={section.name}
      description={sectionLongCopy(section.slug, section.description)}
      capTypes={capTypes}
    />
  )
}
