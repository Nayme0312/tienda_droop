'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ProductForm } from '@/components/admin/product-form'
import { adminRoutes } from '@/lib/admin/routes'

export default function NewProductPage() {
  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Link href={adminRoutes.products}>
          <ArrowLeft className="size-4" />
          Volver a productos
        </Link>
      </Button>

      <AdminPageHeader
        title="Nuevo producto"
        description="Rellena los datos del producto para anadirlo al catalogo."
      />

      <ProductForm mode="create" />
    </>
  )
}
