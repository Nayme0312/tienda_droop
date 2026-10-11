import type { Metadata } from 'next'
import { loadVisibleSections } from '@/lib/api/public-products'
import { PaymentResult } from '@/components/checkout/payment-result'

export const metadata: Metadata = {
  title: 'Estado del pago | STREETVIBE',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

/**
 * Pagina de retorno del Web Checkout. Wompi redirige aqui con ?id=<transaccion>.
 * El estado NO se lee de la URL: PaymentResult lo consulta al servidor, que a
 * su vez lo pregunta a Wompi.
 */
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>
}) {
  const [{ id }, sections] = await Promise.all([searchParams, loadVisibleSections()])
  const transactionId = typeof id === 'string' ? id : null

  return <PaymentResult sections={sections} transactionId={transactionId} />
}
