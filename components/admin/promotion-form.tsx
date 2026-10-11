'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Percent, Save, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { formatPrice } from '@/lib/admin/format'
import {
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  validatePromotionInput,
  type PromotionFieldErrors,
} from '@/lib/admin/promotion-schema'
import {
  endOfDayInstant,
  startOfDayInstant,
  toDateInputValue,
  todayInputValue,
} from '@/lib/admin/promotion-dates'
import { adminRoutes } from '@/lib/admin/routes'
import type {
  AdminPromotion,
  PromotionScope,
} from '@/lib/admin/types'
import { ProductMultiSelect } from './product-multi-select'
import { usePromotions } from './promotions-provider'
import { useProducts } from './products-provider'

const QUICK_PERCENTAGES = [10, 15, 20, 30, 50]

/**
 * Formulario de promocion, compartido por crear y editar.
 *
 * Las fechas se eligen como dias de calendario y se convierten a instantes con
 * el desplazamiento fijo de la tienda (ver lib/admin/promotion-dates.ts): el dia
 * de inicio empieza a las 00:00 y el de fin termina a las 23:59:59.
 */
export function PromotionForm({
  mode,
  promotion,
}: {
  mode: 'create' | 'edit'
  promotion?: AdminPromotion
}) {
  const router = useRouter()
  const { createPromotion, updatePromotion } = usePromotions()
  const { products, isLoading: productsLoading } = useProducts()

  const [name, setName] = useState(promotion?.name ?? '')
  const [discountPercent, setDiscountPercent] = useState(
    promotion ? String(promotion.discountPercent) : '',
  )
  const [scope, setScope] = useState<PromotionScope>(promotion?.scope ?? 'all')
  const [startDate, setStartDate] = useState(
    promotion ? toDateInputValue(promotion.startsAt) : todayInputValue(),
  )
  const [endDate, setEndDate] = useState(
    promotion ? toDateInputValue(promotion.endsAt) : todayInputValue(),
  )
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true)
  const [productIds, setProductIds] = useState<string[]>(
    promotion?.productIds ?? [],
  )

  const [errors, setErrors] = useState<PromotionFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = mode === 'edit'
  const percent = Number(discountPercent)
  const validPercent =
    Number.isInteger(percent) && percent >= MIN_DISCOUNT && percent <= MAX_DISCOUNT

  /** Ejemplo en vivo con un producto real, para ver el efecto del descuento. */
  const example = useMemo(() => {
    if (!validPercent) return null
    const pool =
      scope === 'selected' && productIds.length > 0
        ? products.filter((p) => productIds.includes(p.id))
        : products
    const product = pool[0]
    if (!product) return null
    return {
      name: product.name,
      original: product.price,
      discounted: Math.round((product.price * (100 - percent)) / 100),
    }
  }, [validPercent, percent, scope, productIds, products])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const candidate = {
      name,
      discountPercent: discountPercent.trim() === '' ? Number.NaN : Number(discountPercent),
      scope,
      startsAt: startDate ? startOfDayInstant(startDate) : '',
      endsAt: endDate ? endOfDayInstant(endDate) : '',
      isActive,
      productIds: scope === 'selected' ? productIds : [],
    }

    const result = validatePromotionInput(candidate)
    if (!result.success) {
      setErrors(result.errors)
      toast.error('Revisa los campos marcados')
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      if (isEdit && promotion) {
        await updatePromotion(promotion.id, result.data)
        toast.success(`"${result.data.name}" se ha actualizado`)
      } else {
        await createPromotion(result.data)
        toast.success(`"${result.data.name}" se ha creado`)
      }
      router.push(adminRoutes.promotions)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors(err.fieldErrors as PromotionFieldErrors)
        toast.error(err.message)
      } else {
        toast.error(
          isEdit
            ? 'No se pudo guardar la promocion'
            : 'No se pudo crear la promocion',
        )
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          <FormSection
            title="Datos de la promocion"
            description="El nombre solo se usa en el panel para identificarla."
          >
            <Field label="Nombre" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Black Friday 2026"
                maxLength={120}
                aria-invalid={Boolean(errors.name)}
                className="bg-card/60"
              />
            </Field>

            <Field
              label="Porcentaje de descuento"
              htmlFor="discountPercent"
              error={errors.discountPercent}
              hint={`Entre ${MIN_DISCOUNT}% y ${MAX_DISCOUNT}%.`}
            >
              <div className="relative">
                <Input
                  id="discountPercent"
                  type="number"
                  inputMode="numeric"
                  min={MIN_DISCOUNT}
                  max={MAX_DISCOUNT}
                  step={1}
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  placeholder="20"
                  aria-invalid={Boolean(errors.discountPercent)}
                  className="bg-card/60 pr-9"
                />
                <Percent className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PERCENTAGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDiscountPercent(String(value))}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      Number(discountPercent) === value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    )}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </Field>
          </FormSection>

          <FormSection
            title="Vigencia"
            description="El dia de inicio cuenta desde las 00:00 y el de fin hasta las 23:59."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fecha de inicio" htmlFor="startDate" error={errors.startsAt}>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-invalid={Boolean(errors.startsAt)}
                  className="bg-card/60"
                />
              </Field>
              <Field label="Fecha de fin" htmlFor="endDate" error={errors.endsAt}>
                <Input
                  id="endDate"
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-invalid={Boolean(errors.endsAt)}
                  className="bg-card/60"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="A que se aplica"
            description="Si un producto entra en una promocion global y en otra especifica, se aplica la especifica. Los descuentos nunca se suman."
          >
            <Field label="Alcance" htmlFor="scope" error={errors.scope}>
              <Select
                value={scope}
                onValueChange={(value) => setScope(value as PromotionScope)}
              >
                <SelectTrigger id="scope" className="w-full bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  <SelectItem value="selected">
                    Solo los productos seleccionados
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {scope === 'selected' && (
              <>
                {productsLoading ? (
                  <div className="h-40 animate-pulse rounded-xl border border-border bg-card/40" />
                ) : (
                  <ProductMultiSelect
                    products={products}
                    selectedIds={productIds}
                    onChange={setProductIds}
                    disabled={isSubmitting}
                    error={errors.productIds}
                  />
                )}
              </>
            )}
          </FormSection>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-20 lg:space-y-6">
            <FormSection title="Estado">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Promocion activa
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Si esta desactivada no se aplica, aunque las fechas esten
                    dentro del rango.
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label="Promocion activa"
                  className="mt-0.5 shrink-0"
                />
              </div>
            </FormSection>

            <FormSection title="Como quedaria">
              {example ? (
                <div>
                  <p className="truncate text-xs text-muted-foreground">
                    {example.name}
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {formatPrice(example.discounted)}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground line-through">
                      {formatPrice(example.original)}
                    </span>
                    <span className="inline-flex items-center rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">
                      {`-${percent}%`}
                    </span>
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    El precio original no se modifica en la base de datos: el
                    precio promocional se calcula al mostrarlo.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Introduce un porcentaje valido para ver un ejemplo con un
                  producto real.
                </p>
              )}
            </FormSection>

            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              {Object.keys(errors).length > 0 && (
                <p className="flex items-start gap-2 text-xs text-red-400">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Hay campos por corregir antes de guardar.
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isEdit ? 'Guardar cambios' : 'Crear promocion'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.push(adminRoutes.promotions)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
