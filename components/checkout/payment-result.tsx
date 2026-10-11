"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  CircleCheck,
  CircleX,
  Clock,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"
import { useCartStore } from "@/lib/cart-store"
import { formatPrice } from "@/lib/format"
import { EASE_OUT } from "@/lib/motion"
import { API_ROUTES, ApiError, api } from "@/lib/api/client"
import type { StoreSection } from "@/lib/products"
import type { PaymentStatusResponse, PublicPaymentStatus } from "@/lib/checkout/types"

const POLL_INTERVAL_MS = 4000
/** Tras ~2 minutos en PENDING se deja de consultar y se explica que llegara. */
const MAX_POLLS = 30

const COPY: Record<
  PublicPaymentStatus,
  { title: string; text: string; icon: LucideIcon; tone: string }
> = {
  APPROVED: {
    title: "Pago aprobado",
    text: "Recibimos tu pago y tu pedido quedo registrado. Te contactaremos para coordinar la entrega.",
    icon: CircleCheck,
    tone: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10",
  },
  PENDING: {
    title: "Pago pendiente",
    text: "Tu pago esta en proceso. Esta pagina se actualiza sola; tambien te avisaremos cuando se confirme.",
    icon: Clock,
    tone: "text-amber-500 border-amber-500/20 bg-amber-500/10",
  },
  DECLINED: {
    title: "Pago rechazado",
    text: "Tu entidad financiera rechazo el pago. No se hizo ningun cobro. Puedes intentarlo de nuevo o pedir por WhatsApp.",
    icon: CircleX,
    tone: "text-red-500 border-red-500/20 bg-red-500/10",
  },
  VOIDED: {
    title: "Pago cancelado",
    text: "La transaccion fue anulada. Tu carrito sigue disponible para intentarlo de nuevo.",
    icon: CircleX,
    tone: "text-red-500 border-red-500/20 bg-red-500/10",
  },
  ERROR: {
    title: "No se pudo completar el pago",
    text: "Hubo un error procesando la transaccion. No se hizo ningun cobro. Intentalo de nuevo.",
    icon: TriangleAlert,
    tone: "text-red-500 border-red-500/20 bg-red-500/10",
  },
}

/**
 * Resultado del pago. Consulta el estado al servidor (que lo verifica con la
 * API de Wompi) y, mientras este PENDING, vuelve a consultar cada pocos
 * segundos. Si el pago queda aprobado, vacia el carrito.
 */
export function PaymentResult({
  sections,
  transactionId,
}: {
  sections: StoreSection[]
  transactionId: string | null
}) {
  const clearCart = useCartStore((s) => s.clearCart)
  const [result, setResult] = useState<PaymentStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(
    transactionId ? null : "No recibimos informacion del pago. Si cerraste el checkout, tu carrito sigue disponible.",
  )
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (!transactionId) return
    let active = true
    let polls = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const check = async () => {
      try {
        const data = await api.get<PaymentStatusResponse>(
          API_ROUTES.checkoutStatus(transactionId),
        )
        if (!active) return
        setResult(data)
        setError(null)
        if (data.status === "APPROVED") clearCart()
        if (data.status === "PENDING") {
          polls += 1
          if (polls < MAX_POLLS) timer = setTimeout(check, POLL_INTERVAL_MS)
          else setGaveUp(true)
        }
      } catch (err) {
        if (!active) return
        setError(
          err instanceof ApiError && err.status === 404
            ? "No encontramos esa transaccion."
            : "No pudimos consultar el estado del pago. Recarga la pagina en unos segundos.",
        )
      }
    }

    void check()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [transactionId, clearCart])

  const copy = result ? COPY[result.status] : null
  const Icon = copy?.icon
  const canRetry = result && result.status !== "APPROVED" && result.status !== "PENDING"

  return (
    <>
      <Navbar sections={sections} />
      <main className="flex min-h-screen items-center pt-28 pb-20">
        <div className="mx-auto w-full max-w-lg px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="rounded-2xl border border-border bg-card/60 p-6 text-center sm:p-8"
          >
            {error && !result ? (
              <>
                <TriangleAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
              </>
            ) : !copy || !Icon ? (
              <>
                <LoaderCircle className="mx-auto mb-4 h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Verificando tu pago con Wompi...</p>
              </>
            ) : (
              <>
                <span
                  className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border ${copy.tone}`}
                >
                  <Icon className="h-8 w-8" />
                </span>
                <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                  {copy.title}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {gaveUp
                    ? "Tu pago sigue en proceso. Cuando Wompi lo confirme, tu pedido quedara registrado automaticamente."
                    : copy.text}
                </p>
                {result?.reference && (
                  <dl className="mt-6 space-y-2 rounded-xl border border-border/60 bg-background/50 p-4 text-left text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Referencia</dt>
                      <dd className="font-mono text-xs font-semibold text-foreground">{result.reference}</dd>
                    </div>
                    {result.total !== null && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Total</dt>
                        <dd className="font-semibold text-foreground">{formatPrice(result.total)}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {(canRetry || (error && !result)) && (
                <Link
                  href="/checkout"
                  className="rounded-lg bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-wider text-background transition-opacity hover:opacity-90"
                >
                  Intentar de nuevo
                </Link>
              )}
              <Link
                href="/"
                className="rounded-lg border border-border px-6 py-3 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-foreground/40"
              >
                Volver a la tienda
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
