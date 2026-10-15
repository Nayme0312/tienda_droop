import type { Metadata } from "next"
import { loadPublicProducts, loadVisibleSections } from "@/lib/api/public-products"
import { CatalogPage } from "@/components/catalog-page"

type PageProps = { searchParams: Promise<{ q?: string | string[] }> }

// Igual que las secciones: precios y visibilidad siempre al dia.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Buscar | STREETVIBE",
  description: "Busca en todo el catalogo de STREETVIBE.",
  robots: { index: false },
}

/**
 * Resultados de la lupa de la barra superior (/buscar?q=...). Carga todo el
 * catalogo publico y CatalogPage lo filtra con el texto buscado, que el
 * cliente puede seguir afinando desde el buscador de la pagina.
 */
export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 120) ?? ""

  const [products, sections] = await Promise.all([
    loadPublicProducts(),
    loadVisibleSections(),
  ])

  return (
    // key: una nueva busqueda desde la barra reinicia el buscador de la pagina.
    <CatalogPage
      key={query}
      products={products}
      sections={sections}
      title="Buscar"
      description="Todo el catalogo: busca por nombre, color, talla o referencia."
      initialSearch={query}
    />
  )
}
