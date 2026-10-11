'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, Plus, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api/client'
import { formatDate, formatPrice } from '@/lib/admin/format'
import { MANUAL_PAYMENT_METHODS, manualSaleSchema } from '@/lib/admin/sale-schema'
import * as productsService from '@/lib/admin/products-service'
import * as salesService from '@/lib/admin/sales-service'
import {
  PAYMENT_METHOD_LABELS,
  type AdminProduct,
  type ManualPaymentMethod,
  type ManualSaleInput,
} from '@/lib/admin/types'
import { ProductSearch } from './product-search'
import { useProducts } from './products-provider'
import { StockBadge } from './status-badge'

/** Hoy en hora de Colombia (UTC-5), "YYYY-MM-DD". */
function todayInBogota(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

interface FormState {
  productId: string
  quantity: string
  unitPrice: string
  paymentMethod: ManualPaymentMethod
  customerName: string
  soldAt: string
  notes: string
}

const emptyForm = (): FormState => ({
  productId: '',
  quantity: '1',
  unitPrice: '',
  paymentMethod: 'CASH',
  customerName: '',
  soldAt: todayInBogota(),
  notes: '',
})

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 aria-[invalid=true]:border-red-500/60'

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

/**
 * Formulario de venta presencial: datos -> resumen -> confirmar.
 *
 * El stock que se muestra es orientativo; quien decide es el servidor, que lo
 * descuenta en la misma transaccion en la que crea la venta. Cada apertura del
 * dialogo genera una clave de idempotencia: confirmar dos veces la misma venta
 * no la duplica.
 */
export function RegisterSaleDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered?: () => void
}) {
  const { refresh } = useProducts()
  const [form, setForm] = useState<FormState>(emptyForm)
  // Producto elegido en el buscador, con el precio y el stock que devolvio la
  // API en ese momento.
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [step, setStep] = useState<'form' | 'summary'>('form')
  const [sale, setSale] = useState<ManualSaleInput | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  // Cada vez que se abre: formulario limpio y clave nueva.
  useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setProduct(null)
    setStep('form')
    setSale(null)
    setErrors({})
    setSubmitError(null)
    setIdempotencyKey(crypto.randomUUID())
  }, [open])

  const currentPrice = product ? (product.discountedPrice ?? product.price) : null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleProductSelect = (selected: AdminProduct | null) => {
    setProduct(selected)
    setErrors((current) => ({ ...current, productId: '', quantity: '' }))
    setForm((current) => ({
      ...current,
      productId: selected?.id ?? '',
      // Se propone el precio actual; el administrador puede cambiarlo por el
      // precio al que realmente vendio.
      unitPrice: selected
        ? String(selected.discountedPrice ?? selected.price)
        : '',
    }))
  }

  const handleReview = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)

    const parsed = manualSaleSchema.safeParse({
      productId: form.productId,
      quantity: form.quantity.trim() === '' ? NaN : Number(form.quantity),
      unitPrice: form.unitPrice.trim() === '' ? NaN : Number(form.unitPrice),
      paymentMethod: form.paymentMethod,
      customerName: form.customerName.trim() || undefined,
      soldAt: form.soldAt,
      notes: form.notes.trim() || undefined,
      idempotencyKey,
    })

    const next: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message
      }
    } else {
      if (!product) next.productId = 'Selecciona un producto'
      else if (parsed.data.quantity > product.stock) {
        next.quantity =
          product.stock > 0
            ? `Solo hay ${product.stock} en stock`
            : 'Producto agotado'
      }
      if (parsed.data.soldAt > todayInBogota()) {
        next.soldAt = 'La fecha no puede ser futura'
      }
    }

    setErrors(next)
    if (!parsed.success || Object.keys(next).length > 0) return

    setSale(parsed.data)
    setStep('summary')
  }

  const handleConfirm = async () => {
    if (!sale || isSaving) return
    setIsSaving(true)
    setSubmitError(null)
    try {
      const order = await salesService.registerSale(sale)
      toast.success(`Venta registrada: ${formatPrice(order.total)}`)
      onOpenChange(false)
      // El stock cambio en el servidor: se recarga la lista de productos.
      void refresh()
      onRegistered?.()
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors)
        setStep('form')
      }
      setSubmitError(
        err instanceof ApiError ? err.message : 'No se pudo registrar la venta.',
      )
      // Un 409 es stock insuficiente: se recarga para mostrar el stock real.
      if (err instanceof ApiError && err.status === 409) {
        void refresh()
        void productsService
          .getProductById(sale.productId)
          .then((fresh) => fresh && setProduct(fresh))
          .catch(() => {})
        setStep('form')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' ? 'Registrar venta' : 'Confirmar venta'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Venta presencial que no pasa por Wompi. Al confirmarla se descuenta el stock.'
              : 'Revisa los datos antes de guardar.'}
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleReview} noValidate className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Producto
              </span>
              {product && currentPrice !== null ? (
                <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Codigo:{' '}
                        <span className="font-mono font-semibold text-foreground">
                          {product.code}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProductSelect(null)}
                      className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5 text-sm">
                    <span className="text-muted-foreground">
                      Precio actual{' '}
                      <span className="font-semibold text-foreground">
                        {formatPrice(currentPrice)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      Stock <StockBadge stock={product.stock} />
                    </span>
                  </div>
                </div>
              ) : (
                <ProductSearch
                  onSelect={handleProductSelect}
                  invalid={Boolean(errors.productId)}
                />
              )}
              {errors.productId && (
                <span className="mt-1 block text-xs text-red-400">
                  {errors.productId}
                </span>
              )}
            </div>

            <Field label="Cantidad" error={errors.quantity}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={product?.stock || undefined}
                step={1}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                aria-invalid={Boolean(errors.quantity)}
                className={fieldClass}
              />
            </Field>

            <Field label="Precio de venta (unidad)" error={errors.unitPrice}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.unitPrice}
                onChange={(e) => set('unitPrice', e.target.value)}
                aria-invalid={Boolean(errors.unitPrice)}
                className={fieldClass}
              />
            </Field>

            <Field label="Metodo de pago" error={errors.paymentMethod}>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  set('paymentMethod', e.target.value as ManualPaymentMethod)
                }
                className={fieldClass}
              >
                {MANUAL_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha" error={errors.soldAt}>
              <input
                type="date"
                max={todayInBogota()}
                value={form.soldAt}
                onChange={(e) => set('soldAt', e.target.value)}
                aria-invalid={Boolean(errors.soldAt)}
                className={fieldClass}
              />
            </Field>

            <Field
              label="Cliente (opcional)"
              error={errors.customerName}
              className="sm:col-span-2"
            >
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)}
                maxLength={120}
                className={fieldClass}
              />
            </Field>

            <Field
              label="Observaciones (opcional)"
              error={errors.notes}
              className="sm:col-span-2"
            >
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                maxLength={500}
                className={`${fieldClass} resize-none`}
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Revisar venta</Button>
            </DialogFooter>
          </form>
        ) : (
          sale && (
            <>
              <dl className="space-y-2.5 rounded-xl border border-border bg-background/50 p-4 text-sm">
                {(
                  [
                    ['Producto', product?.name ?? '—'],
                    ...(product ? [['Codigo', String(product.code)]] : []),
                    ['Cantidad', String(sale.quantity)],
                    ['Precio', formatPrice(sale.unitPrice)],
                    ['Metodo de pago', PAYMENT_METHOD_LABELS[sale.paymentMethod]],
                    ['Fecha', formatDate(`${sale.soldAt}T00:00:00Z`)],
                    ...(sale.customerName ? [['Cliente', sale.customerName]] : []),
                    ...(sale.notes ? [['Observaciones', sale.notes]] : []),
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words text-right text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                  <dt className="font-medium text-foreground">Total</dt>
                  <dd className="text-xl font-bold tabular-nums text-foreground">
                    {formatPrice(sale.unitPrice * sale.quantity)}
                  </dd>
                </div>
              </dl>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('form')}
                  disabled={isSaving}
                >
                  <ArrowLeft className="size-4" />
                  Editar
                </Button>
                <Button type="button" onClick={handleConfirm} disabled={isSaving}>
                  {isSaving && <LoaderCircle className="size-4 animate-spin" />}
                  Confirmar venta
                </Button>
              </DialogFooter>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Boton "+ Registrar venta" con su dialogo. */
export function RegisterSaleButton({
  onRegistered,
  variant = 'default',
}: {
  onRegistered?: () => void
  variant?: 'default' | 'outline'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Registrar venta
      </Button>
      <RegisterSaleDialog
        open={open}
        onOpenChange={setOpen}
        onRegistered={onRegistered}
      />
    </>
  )
}
