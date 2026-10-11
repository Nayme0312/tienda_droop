'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { PromotionForm } from '@/components/admin/promotion-form'
import { adminRoutes } from '@/lib/admin/routes'

export default function NewPromotionPage() {
  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Link href={adminRoutes.promotions}>
          <ArrowLeft className="size-4" />
          Volver a promociones
        </Link>
      </Button>

      <AdminPageHeader
        title="Nueva promocion"
        description="Define el descuento, las fechas y a que productos se aplica."
      />

      <PromotionForm mode="create" />
    </>
  )
}
