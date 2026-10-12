"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { VideoFrame } from "@/components/video-frame"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CreditCard,
  LoaderCircle,
  Lock,
  MessageCircle,
  TriangleAlert,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"
import { useCartStore } from "@/lib/cart-store"
import { formatPrice } from "@/lib/format"
import { EASE_OUT } from "@/lib/motion"
import { API_ROUTES, ApiError, api } from "@/lib/api/client"
import type { StoreSection } from "@/lib/products"
import {
  customerSchema,
  type CheckoutItemInput,
  type CheckoutQuote,
  type CreateCheckoutResponse,
  type CustomerInput,
} from "@/lib/checkout/types"

type FormState = Required<Omit<CustomerInput, "notes">> & { notes: string }

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  region: "",
  notes: "",
}

const FIELDS: {
  key: keyof FormState
  label: string
  type?: string
  autoComplete?: string
  full?: boolean
}[] = [
  { key: "name", label: "Nombre completo", autoComplete: "name", full: true },
  { key: "email", label: "Correo", type: "email", autoComplete: "email" },
  { key: "phone", label: "Telefono", type: "tel", autoComplete: "tel" },
  { key: "address", label: "Direccion de entrega", autoComplete: "street-address", full: true },
  { key: "city", label: "Ciudad", autoComplete: "address-level2" },
  { key: "region", label: "Departamento", autoComplete: "address-level1" },
]

/**
 * Checkout con Wompi.
 *
 * El resumen y el total que se muestran aqui los calcula el SERVIDOR
 * (/api/checkout/quote) a partir del carrito: si un precio o una promocion
 * cambio desde que el cliente anadio el producto, lo ve antes de pagar.
 * Al confirmar, el servidor vuelve a calcular todo y redirige a Wompi.
 */
export function CheckoutView({ sections }: { sections: StoreSection[] }) {
  const items = useCartStore((s) => s.items)
  const [mounted, setMounted] = useState(false)
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // El carrito vive en localStorage: solo se lee tras el mount.
  useEffect(() => setMounted(true), [])

  // Solo identificadores y cantidades: el precio lo pone el servidor.
  const cartPayload: CheckoutItemInput[] = useMemo(
    () =>
      items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        size: item.size || undefined,
        color: item.color || undefined,
      })),
    [items],
  )

  useEffect(() => {
    if (!mounted || cartPayload.length === 0) return
    let active = true
    setQuoteError(null)
    api
      .post<CheckoutQuote>(API_ROUTES.checkoutQuote, { items: cartPayload })
      .then((result) => active && setQuote(result))
      .catch((err) => {
        if (!active) return
        setQuote(null)
        setQuoteError(
          err instanceof ApiError ? err.message : "No se pudo calcular el pedido.",
        )
      })
    return () => {
      active = false
    }
  }, [mounted, cartPayload])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!quote || isSubmitting) return
    setSubmitError(null)

    // Mismo esquema que valida el servidor, para mostrar el error bajo cada campo.
    const parsed = customerSchema.safeParse({
      ...form,
      notes: form.notes.trim() || undefined,
    })
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0])
        errors[key] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    try {
      const { checkoutUrl } = await api.post<CreateCheckoutResponse>(API_ROUTES.checkout, {
        items: cartPayload,
        customer: parsed.data,
      })
      // El carrito NO se vacia aqui: si el cliente vuelve atras sin pagar,
      // lo conserva. Se vacia cuando el pago queda aprobado.
      window.location.assign(checkoutUrl)
    } catch (err) {
      setIsSubmitting(false)
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else {
        setSubmitError("No se pudo iniciar el pago. Intentalo de nuevo.")
      }
    }
  }

  const isEmpty = mounted && items.length === 0

  return (
    <>
      <Navbar sections={sections} />
      <main className="min-h-screen pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="mb-10"
          >
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Seguir comprando
            </Link>
            <h1 className="text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              Finalizar compra
            </h1>
          </motion.div>

          {!mounted ? (
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />
          ) : isEmpty ? (
            <div className="rounded-xl border border-border bg-card/50 p-10 text-center">
              <p className="text-lg font-semibold text-foreground">Tu carrito esta vacio</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-wider text-background"
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
              {/* Datos de entrega */}
              <form onSubmit={handleSubmit} className="order-2 space-y-6 lg:order-1" noValidate>
                <div className="rounded-xl border border-border bg-card/50 p-5 sm:p-6">
                  <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">
                    Datos de entrega
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {FIELDS.map((field) => (
                      <label key={field.key} className={field.full ? "sm:col-span-2" : undefined}>
                        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          {field.label}
                        </span>
                        <input
                          type={field.type ?? "text"}
                          autoComplete={field.autoComplete}
                          required
                          value={form[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          aria-invalid={Boolean(fieldErrors[field.key])}
                          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/50 aria-[invalid=true]:border-red-500/60"
                        />
                        {fieldErrors[field.key] && (
                          <span className="mt-1 block text-xs text-red-500">
                            {fieldErrors[field.key]}
                          </span>
                        )}
                      </label>
                    ))}
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Notas (opcional)
                      </span>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/50"
                      />
                    </label>
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!quote || isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-4 text-sm font-semibold uppercase tracking-wider text-background shadow-lg shadow-black/20 transition-[translate,scale,opacity] duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isSubmitting
                    ? "Redirigiendo a Wompi..."
                    : quote
                      ? `Pagar ${formatPrice(quote.total)} con Wompi`
                      : "Pagar con Wompi"}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  El pago se realiza en la plataforma segura de Wompi.
                </p>
                {/* Aviso de Habeas Data: continuar al pago es la autorizacion (Ley 1581 de 2012) */}
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Al continuar aceptas los{" "}
                  <Link href="/terminos-y-condiciones" className="underline underline-offset-4 hover:text-foreground">
                    Términos y condiciones
                  </Link>
                  , la{" "}
                  <Link href="/politicas-de-envio-y-devoluciones" className="underline underline-offset-4 hover:text-foreground">
                    Política de envíos y devoluciones
                  </Link>{" "}
                  y autorizas el tratamiento de tus datos según la{" "}
                  <Link href="/politica-de-privacidad" className="underline underline-offset-4 hover:text-foreground">
                    Política de privacidad
                  </Link>
                  .
                </p>
              </form>

              {/* Resumen calculado por el servidor */}
              <aside className="order-1 lg:order-2">
                <div className="rounded-xl border border-border bg-card/50 p-5 sm:p-6 lg:sticky lg:top-28">
                  <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">
                    Resumen del pedido
                  </h2>

                  {quoteError ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{quoteError}</p>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Ajusta tu carrito o pide por WhatsApp desde el carrito.
                      </p>
                    </div>
                  ) : !quote ? (
                    <div className="space-y-3">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-accent/40" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <ul className="space-y-4">
                        {quote.lines.map((line, i) => (
                          <li key={`${line.productId}-${line.size}-${i}`} className="flex gap-3">
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-accent">
                              {line.video ? (
                                <VideoFrame
                                  src={line.video}
                                  label={line.name}
                                  className="absolute inset-0 h-full w-full"
                                />
                              ) : (
                                <Image src={line.image} alt={line.name} fill sizes="64px" className="object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground break-words">
                                {line.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[line.size && `Talla ${line.size}`, line.color, `x${line.quantity}`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-foreground">
                              {formatPrice(line.lineTotal)}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                        <span className="text-2xl font-black text-foreground">
                          {formatPrice(quote.total)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
