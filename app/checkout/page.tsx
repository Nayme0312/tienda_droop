import type { Metadata } from 'next'
import { loadVisibleSections } from '@/lib/api/public-products'
import { CheckoutView } from '@/components/checkout/checkout-view'

export const metadata: Metadata = {
  title: 'Finalizar compra | STREETVIBE',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const sections = await loadVisibleSections()
  return <CheckoutView sections={sections} />
}
