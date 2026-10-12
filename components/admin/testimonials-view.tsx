'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  MessageSquareQuote,
  Pencil,
  Plus,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  StarRating,
  TestimonialAvatar,
  TestimonialCard,
} from '@/components/testimonials/testimonial-card'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import type { AdminTestimonial } from '@/lib/admin/types'
import * as testimonialsService from '@/lib/admin/testimonials-service'
import { uploadProductImage } from '@/lib/admin/products-service'
import {
  TESTIMONIAL_COMMENT_MAX,
  TESTIMONIAL_COMMENT_MIN,
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_PRODUCT_MAX,
  TESTIMONIAL_RATING_MAX,
  formatRelativeDate,
} from '@/lib/testimonials/testimonials'
import { AdminPageHeader } from './admin-page-header'
import { ConfirmDialog } from './confirm-dialog'

/**
 * Testimonios de la portada: crear, editar, eliminar y activar o desactivar.
 *
 * Los cambios se guardan al instante en PostgreSQL y la tienda los muestra en
 * la siguiente carga. Solo los activos llegan a la portada, del mas reciente
 * (fecha de la resena) al mas antiguo.
 */
export function TestimonialsView() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // Dialogo de crear/editar: undefined = cerrado, null = testimonio nuevo.
  const [editing, setEditing] = useState<AdminTestimonial | null | undefined>(
    undefined,
  )
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setTestimonials(await testimonialsService.getTestimonials())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los testimonios',
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await load()
      if (active) setIsLoading(false)
    })()
    return () => {
      active = false
    }
  }, [load])

  const active = testimonials.filter((t) => t.isActive)
  const average =
    active.length > 0
      ? active.reduce((sum, t) => sum + t.rating, 0) / active.length
      : null

  const handleToggle = async (testimonial: AdminTestimonial) => {
    setPendingId(testimonial.id)
    try {
      const updated = await testimonialsService.updateTestimonial(testimonial.id, {
        isActive: !testimonial.isActive,
      })
      setTestimonials((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      toast.success(
        updated.isActive
          ? `El testimonio de ${updated.customerName} ya se ve en la tienda`
          : `El testimonio de ${updated.customerName} se ha ocultado`,
      )
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await testimonialsService.deleteTestimonial(deleting.id)
      setTestimonials((current) => current.filter((item) => item.id !== deleting.id))
      toast.success(`El testimonio de ${deleting.customerName} se ha eliminado`)
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar el testimonio')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaved = (saved: AdminTestimonial) => {
    setTestimonials((current) => {
      const exists = current.some((item) => item.id === saved.id)
      const next = exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
      return next.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
    })
  }

  return (
    <>
      <AdminPageHeader
        title="Testimonios"
        description="Resenas de clientes que se muestran en la portada. Solo las activas son visibles, de la mas reciente a la mas antigua."
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={adminRoutes.storefront} target="_blank">
                <ExternalLink className="size-4" />
                Ver tienda
              </Link>
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Nuevo testimonio
            </Button>
          </>
        }
      />

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <SummaryTile label="Total" value={isLoading ? '–' : String(testimonials.length)} />
        <SummaryTile label="Activos" value={isLoading ? '–' : String(active.length)} />
        <SummaryTile
          label="Promedio"
          value={average === null ? '–' : average.toFixed(1)}
          icon={<Star className="size-4 fill-amber-400 text-amber-400" />}
        />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && testimonials.length > 0 && active.length === 0 && (
        <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
          No hay testimonios activos: la seccion &quot;Lo Que Dicen&quot; no se
          muestra en la portada.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-card/40"
            />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <MessageSquareQuote className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Todavia no hay testimonios
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Crea el primero: aparecera en la portada en cuanto lo guardes activo.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Nuevo testimonio
            </Button>
          </div>
        )
      ) : (
        <ul className="space-y-3">
          {testimonials.map((testimonial) => {
            const pending = pendingId === testimonial.id
            return (
              <li
                key={testimonial.id}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start',
                  testimonial.isActive ? 'bg-card/60' : 'bg-card/20',
                )}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <TestimonialAvatar
                    name={testimonial.customerName}
                    avatarUrl={testimonial.avatarUrl}
                    className={cn('size-11', !testimonial.isActive && 'opacity-60')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p
                        className={cn(
                          'truncate text-sm font-semibold',
                          testimonial.isActive ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {testimonial.customerName}
                      </p>
                      {testimonial.isVerified && (
                        <BadgeCheck
                          aria-label="Compra verificada"
                          className="size-4 fill-foreground text-background"
                        />
                      )}
                      {!testimonial.isActive && (
                        <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <StarRating rating={testimonial.rating} starClassName="size-3.5" />
                      <span aria-hidden>·</span>
                      <span>{formatRelativeDate(testimonial.reviewedAt)}</span>
                      {testimonial.productName && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{testimonial.productName}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/80">
                      {testimonial.comment}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-border pt-3 sm:border-0 sm:pt-0">
                  {pending && (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(testimonial)}
                    aria-label={`Editar el testimonio de ${testimonial.customerName}`}
                    title="Editar"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(testimonial)}
                    aria-label={`Eliminar el testimonio de ${testimonial.customerName}`}
                    title="Eliminar"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Switch
                    checked={testimonial.isActive}
                    disabled={pending}
                    onCheckedChange={() => void handleToggle(testimonial)}
                    aria-label={
                      testimonial.isActive
                        ? `Desactivar el testimonio de ${testimonial.customerName}`
                        : `Activar el testimonio de ${testimonial.customerName}`
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TestimonialFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        testimonial={editing ?? null}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}
        title={`Eliminar el testimonio de ${deleting?.customerName ?? ''}`}
        description="Desaparece de la portada y del panel. Si solo quieres ocultarlo, desactivalo. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xl font-bold tabular-nums text-foreground">
        {value}
        {icon}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

/** Fecha de hoy en formato del input date (zona horaria local). */
function todayInputValue(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** ISO -> "YYYY-MM-DD" local, para el input date. */
function toInputDate(iso: string): string {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/**
 * "YYYY-MM-DD" -> ISO. Si es hoy se usa la hora actual (asi la tienda dice
 * "hace un momento"); si es otro dia, el mediodia local, para que ninguna zona
 * horaria lo mueva al dia anterior o siguiente.
 */
function fromInputDate(value: string): string {
  if (value === todayInputValue()) return new Date().toISOString()
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12).toISOString()
}

type FieldErrors = Partial<
  Record<'customerName' | 'comment' | 'rating' | 'productName' | 'avatarUrl' | 'reviewedAt', string>
>

function TestimonialFormDialog({
  open,
  onOpenChange,
  testimonial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Testimonio a editar; sin el, el dialogo crea uno nuevo. */
  testimonial: AdminTestimonial | null
  onSaved: (saved: AdminTestimonial) => void
}) {
  const isEdit = testimonial !== null
  const [customerName, setCustomerName] = useState('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [productName, setProductName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [reviewedDate, setReviewedDate] = useState(todayInputValue())
  const [isVerified, setIsVerified] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setCustomerName(testimonial?.customerName ?? '')
    setComment(testimonial?.comment ?? '')
    setRating(testimonial?.rating ?? 5)
    setHoverRating(null)
    setProductName(testimonial?.productName ?? '')
    setAvatarUrl(testimonial?.avatarUrl ?? null)
    setReviewedDate(testimonial ? toInputDate(testimonial.reviewedAt) : todayInputValue())
    setIsVerified(testimonial?.isVerified ?? true)
    setIsActive(testimonial?.isActive ?? true)
    setErrors({})
  }, [open, testimonial])

  const clearError = (field: keyof FieldErrors) =>
    setErrors((current) => ({ ...current, [field]: undefined }))

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, avatarUrl: 'Elige una imagen (PNG, JPG, WEBP o AVIF)' }))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErrors((current) => ({ ...current, avatarUrl: 'La foto no puede superar los 5 MB' }))
      return
    }
    setIsUploading(true)
    clearError('avatarUrl')
    try {
      setAvatarUrl(await uploadProductImage(file))
    } catch (err) {
      setErrors((current) => ({
        ...current,
        avatarUrl: err instanceof ApiError ? err.message : 'No se pudo subir la foto',
      }))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    const name = customerName.trim()
    const text = comment.trim()
    if (name.length < 2) next.customerName = 'El nombre debe tener al menos 2 caracteres'
    if (text.length < TESTIMONIAL_COMMENT_MIN) {
      next.comment = `El comentario debe tener al menos ${TESTIMONIAL_COMMENT_MIN} caracteres`
    }
    if (!reviewedDate) next.reviewedAt = 'Elige la fecha de la resena'
    else if (reviewedDate > todayInputValue()) next.reviewedAt = 'La fecha no puede estar en el futuro'
    return next
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate()
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }

    setIsSaving(true)
    try {
      const input: testimonialsService.TestimonialInput = {
        customerName: customerName.trim(),
        comment: comment.trim(),
        rating,
        productName: productName.trim() || null,
        avatarUrl,
        isVerified,
        isActive,
        reviewedAt: fromInputDate(reviewedDate),
      }
      const saved = isEdit
        ? await testimonialsService.updateTestimonial(testimonial.id, input)
        : await testimonialsService.createTestimonial(input)
      toast.success(
        isEdit
          ? `El testimonio de ${saved.customerName} se ha actualizado`
          : `El testimonio de ${saved.customerName} se ha creado`,
      )
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors(err.fieldErrors as FieldErrors)
        toast.error(err.message)
      } else {
        toast.error('No se pudo guardar el testimonio')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const busy = isSaving || isUploading
  const shownRating = hoverRating ?? rating

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card sm:max-w-4xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar testimonio' : 'Nuevo testimonio'}</DialogTitle>
            <DialogDescription>
              Si esta activo, aparece en la seccion &quot;Lo Que Dicen&quot; de la
              portada en la siguiente carga.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
            {/* Campos */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <TestimonialAvatar
                  name={customerName || 'Cliente'}
                  avatarUrl={avatarUrl}
                  className="size-16"
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                    className="hidden"
                    onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setAvatarUrl(null)}
                      className="text-muted-foreground"
                    >
                      <X className="size-4" />
                      Quitar
                    </Button>
                  )}
                  <p className="w-full text-xs text-muted-foreground">
                    Opcional. Sin foto se muestran las iniciales. Maximo 5 MB.
                  </p>
                </div>
              </div>
              {errors.avatarUrl && <p className="-mt-2 text-xs text-red-400">{errors.avatarUrl}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="testimonial-name" className="mb-2">
                    Nombre del cliente
                  </Label>
                  <Input
                    id="testimonial-name"
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value)
                      clearError('customerName')
                    }}
                    placeholder="Sofia R."
                    maxLength={TESTIMONIAL_NAME_MAX}
                    autoFocus
                    aria-invalid={Boolean(errors.customerName)}
                    className="bg-background/60"
                  />
                  {errors.customerName && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.customerName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="testimonial-date" className="mb-2">
                    Fecha de la resena
                  </Label>
                  <Input
                    id="testimonial-date"
                    type="date"
                    value={reviewedDate}
                    max={todayInputValue()}
                    onChange={(event) => {
                      setReviewedDate(event.target.value)
                      clearError('reviewedAt')
                    }}
                    aria-invalid={Boolean(errors.reviewedAt)}
                    className="bg-background/60 [color-scheme:dark]"
                  />
                  {errors.reviewedAt && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.reviewedAt}</p>
                  )}
                </div>
              </div>

              <div>
                <Label id="testimonial-rating-label" className="mb-2">
                  Calificacion
                </Label>
                <div
                  role="radiogroup"
                  aria-labelledby="testimonial-rating-label"
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {Array.from({ length: TESTIMONIAL_RATING_MAX }, (_, i) => {
                    const value = i + 1
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={rating === value}
                        aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                        onMouseEnter={() => setHoverRating(value)}
                        onClick={() => setRating(value)}
                        className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Star
                          className={cn(
                            'size-7 transition-colors',
                            value <= shownRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-foreground/10 text-foreground/20',
                          )}
                        />
                      </button>
                    )
                  })}
                  <span className="ml-2 text-sm tabular-nums text-muted-foreground">
                    {shownRating} / {TESTIMONIAL_RATING_MAX}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label htmlFor="testimonial-comment">Comentario</Label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      comment.length > TESTIMONIAL_COMMENT_MAX * 0.9
                        ? 'text-amber-300'
                        : 'text-muted-foreground',
                    )}
                  >
                    {comment.length}/{TESTIMONIAL_COMMENT_MAX}
                  </span>
                </div>
                <Textarea
                  id="testimonial-comment"
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value)
                    clearError('comment')
                  }}
                  placeholder="La calidad de las camisas es increible..."
                  maxLength={TESTIMONIAL_COMMENT_MAX}
                  rows={5}
                  aria-invalid={Boolean(errors.comment)}
                  className="resize-y bg-background/60"
                />
                {errors.comment && <p className="mt-1.5 text-xs text-red-400">{errors.comment}</p>}
              </div>

              <div>
                <Label htmlFor="testimonial-product" className="mb-2">
                  Producto comprado <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="testimonial-product"
                  value={productName}
                  onChange={(event) => {
                    setProductName(event.target.value)
                    clearError('productName')
                  }}
                  placeholder="Gorra LA"
                  maxLength={TESTIMONIAL_PRODUCT_MAX}
                  className="bg-background/60"
                />
                {errors.productName && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.productName}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleRow
                  title="Compra verificada"
                  description="Muestra la insignia de verificacion."
                  checked={isVerified}
                  onChange={setIsVerified}
                  disabled={busy}
                />
                <ToggleRow
                  title="Activo"
                  description="Visible en la portada."
                  checked={isActive}
                  onChange={setIsActive}
                  disabled={busy}
                />
              </div>
            </div>

            {/* Vista previa en vivo: la misma tarjeta que la tienda */}
            <div className="md:sticky md:top-0 md:self-start">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Vista previa
              </p>
              <div className={cn('rounded-2xl bg-background p-3', !isActive && 'opacity-50')}>
                <TestimonialCard
                  className="hover:translate-y-0"
                  testimonial={{
                    customerName: customerName.trim() || 'Nombre del cliente',
                    avatarUrl,
                    rating,
                    comment: comment.trim() || 'Aqui aparecera el comentario del cliente.',
                    productName: productName.trim() || null,
                    isVerified,
                    reviewedAt: reviewedDate ? fromInputDate(reviewedDate) : new Date().toISOString(),
                  }}
                />
              </div>
              {!isActive && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Inactivo: no se mostrara en la tienda.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear testimonio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={title} />
    </div>
  )
}
