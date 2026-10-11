"use client"

import { CatalogPage } from "@/components/catalog-page"
import type { Product, StoreSection } from "@/lib/products"
import type { PublicCapType } from "@/lib/caps/cap-types"

export default function SectionClient({
  products,
  sections,
  title,
  description,
  capTypes,
}: {
  products: Product[]
  sections: StoreSection[]
  title: string
  description: string
  capTypes?: PublicCapType[]
}) {
  return (
    <CatalogPage
      products={products}
      sections={sections}
      title={title}
      description={description}
      capTypes={capTypes}
    />
  )
}
