'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, LoaderCircle, Save, TriangleAlert } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import type { CategoryId } from '@/lib/admin/categories'
import { ApiError } from '@/lib/api/client'
import { formatPrice } from '@/lib/admin/format'
import {
  validateProductInput,
  type ProductFieldErrors,
} from '@/lib/admin/product-schema'
import { adminRoutes } from '@/lib/admin/routes'
import * as capTypesService from '@/lib/admin/cap-types-service'
import { isCapSection } from '@/lib/caps/cap-types'
import { STANDARD_FITTED_CHART, isChartSize } from '@/lib/caps/size-chart'
import type {
  AdminCapType,
  AdminProduct,
  ImageDraft,
  ProductStatus,
} from '@/lib/admin/types'
import {
  DetailsEditor,
  detailsToRows,
  rowsToDetails,
  type DetailRow,
} from './details-editor'
import { ImageUploader } from './image-uploader'
import { useCategories } from './categories-provider'
import { useProducts } from './products-provider'
import { VideoUploader } from './video-uploader'
import { StatusBadge, StockBadge } from './status-badge'
import { TagInput } from './tag-input'
import { VideoFrame } from '@/components/video-frame'

const MAX_EXTRA_IMAGES = 6
const SIZE_SUGGESTIONS = ['S', 'M', 'L', 'XL', 'XXL']
/** Gorras cerradas: las tallas de la tabla con la que filtra la tienda. */
const FITTED_SIZE_SUGGESTIONS = STANDARD_FITTED_CHART.sizes.map((s) => s.label)
const COLOR_SUGGESTIONS = ['Negro', 'Blanco', 'Gris', 'Navy', 'Beige']

/**
 * Los pines solo llevan nombre, descripcion, precio e imagen. El stock no se
 * pide, pero la tienda y el checkout lo exigen para vender: al crear un pin se
 * guarda este valor y al editarlo se conserva el que ya tenia.
 */
const PIN_DEFAULT_STOCK = 999

/** Valor del selector para "sin tipo" (Radix Select no admite ""). */
const NO_CAP_TYPE = 'none'

/** Nombre legible a partir de una ruta ya guardada. */
function draftFromUrl(url: string): ImageDraft {
  const name = url.split('/').pop() || url
  return { url, name }
}

/** "" -> NaN, para que el esquema lo marque como campo invalido. */
function toNumber(value: string): number {
  const trimmed = value.trim()
  return trimmed === '' ? Number.NaN : Number(trimmed)
}

/**
 * Formulario de producto, compartido por crear y editar.
 *
 * Los campos numericos se guardan como string (es lo que da un <input>) y se
 * convierten a numero justo antes de validar, para que el esquema de zod
 * trabaje sobre el modelo de dominio y pueda reutilizarse tal cual en el
 * backend de la siguiente etapa.
 */
export function ProductForm({
  mode,
  product,
}: {
  mode: 'create' | 'edit'
  product?: AdminProduct
}) {
  const router = useRouter()
  const { createProduct, updateProduct, uploadImage } = useProducts()
  const { categories, labelFor } = useCategories()

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(
    product ? String(product.price) : '',
  )
  const [oldPrice, setOldPrice] = useState(
    product?.oldPrice != null ? String(product.oldPrice) : '',
  )
  const [categoryId, setCategoryId] = useState<CategoryId>(
    product?.categoryId ?? '',
  )

  // Producto nuevo: en cuanto llegan las categorias de PostgreSQL se
  // preselecciona la primera, como hacia la lista fija de antes.
  useEffect(() => {
    if (categoryId === '' && categories.length > 0) {
      setCategoryId(categories[0].slug)
    }
  }, [categoryId, categories])
  const [stock, setStock] = useState(product ? String(product.stock) : '')
  const [status, setStatus] = useState<ProductStatus>(
    product?.status ?? 'active',
  )
  const [mainImage, setMainImage] = useState<ImageDraft[]>(
    product?.mainImage ? [draftFromUrl(product.mainImage)] : [],
  )
  const [extraImages, setExtraImages] = useState<ImageDraft[]>(
    product?.images.map(draftFromUrl) ?? [],
  )
  const [video, setVideo] = useState<ImageDraft | null>(
    product?.video ? draftFromUrl(product.video) : null,
  )
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? [])
  const [colors, setColors] = useState<string[]>(product?.colors ?? [])
  const [badge, setBadge] = useState(product?.badge ?? '')
  const [detailRows, setDetailRows] = useState<DetailRow[]>(
    product ? detailsToRows(product.details) : [],
  )

  const [capTypeId, setCapTypeId] = useState<string | null>(
    product?.capTypeId ?? null,
  )
  const [capTypes, setCapTypes] = useState<AdminCapType[]>([])

  const [errors, setErrors] = useState<ProductFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = mode === 'edit'
  const isPin = categoryId === 'pines'
  const isCap = isCapSection(categoryId)

  // Los tipos de gorra se piden solo cuando el producto es una gorra.
  useEffect(() => {
    if (!isCap) return
    let active = true
    capTypesService
      .getCapTypes()
      .then((list) => active && setCapTypes(list))
      .catch(() => {
        if (active) toast.error('No se pudieron cargar los tipos de gorra')
      })
    return () => {
      active = false
    }
  }, [isCap])

  // Asignables: los activos y, si el producto ya tenia uno desactivado, ese
  // tambien, para no perderlo al guardar sin tocarlo.
  const capTypeOptions = capTypes.filter(
    (type) => type.isActive || type.id === capTypeId,
  )
  // Gorra de un tipo con tallas cerradas: sus tallas son las que usa la Guia
  // de tallas de la tienda para filtrar, asi que deben ser de la tabla.
  const isFittedCap =
    isCap && capTypes.some((type) => type.id === capTypeId && type.usesFittedSizes)
  const unknownSizes = isFittedCap
    ? sizes.filter((size) => !isChartSize(size, STANDARD_FITTED_CHART))
    : []

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // En pines los campos ocultos se envian vacios para no guardar datos que
    // el formulario no muestra.
    const candidate = isPin
      ? {
          name,
          description,
          price: toNumber(price),
          oldPrice: null,
          categoryId,
          stock: stock.trim() === '' ? PIN_DEFAULT_STOCK : toNumber(stock),
          status,
          mainImage: mainImage[0]?.url ?? '',
          images: extraImages.map((draft) => draft.url),
          video: video?.url ?? null,
          sizes: [],
          colors: [],
          badge: null,
          details: {},
          capTypeId: null,
        }
      : {
          name,
          description,
          price: toNumber(price),
          oldPrice: oldPrice.trim() === '' ? null : toNumber(oldPrice),
          categoryId,
          stock: toNumber(stock),
          status,
          mainImage: mainImage[0]?.url ?? '',
          images: extraImages.map((draft) => draft.url),
          video: video?.url ?? null,
          sizes,
          colors,
          badge: badge.trim() === '' ? null : badge.trim(),
          details: rowsToDetails(detailRows),
          // Solo las gorras llevan tipo; la API tambien lo fuerza.
          capTypeId: isCap ? capTypeId : null,
        }

    const result = validateProductInput(candidate)
    if (!result.success) {
      setErrors(result.errors)
      toast.error('Revisa los campos marcados')
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      // Las imagenes del pin se suben antes de guardar y el producto se guarda
      // con las URLs definitivas, no con los blob: temporales de la
      // previsualizacion. Las que ya estaban guardadas se dejan tal cual.
      if (isPin) {
        const uploadDrafts = (drafts: ImageDraft[]) =>
          Promise.all(
            drafts.map(async (draft) =>
              draft.file
                ? { url: await uploadImage(draft.file), name: draft.name }
                : draft,
            ),
          )
        const [uploadedMain, uploadedExtras] = await Promise.all([
          uploadDrafts(mainImage),
          uploadDrafts(extraImages),
        ])
        result.data.mainImage = uploadedMain[0]?.url ?? ''
        result.data.images = uploadedExtras.map((draft) => draft.url)
        // Si despues falla el guardado, el reintento no vuelve a subirlas.
        setMainImage(uploadedMain)
        setExtraImages(uploadedExtras)
      }

      // El video se sube en todas las categorias, antes de guardar, para que el
      // producto quede con la URL definitiva y no con el blob: temporal.
      if (video?.file) {
        const uploadedVideo = { url: await uploadImage(video.file), name: video.name }
        result.data.video = uploadedVideo.url
        // Si despues falla el guardado, el reintento no vuelve a subirlo.
        setVideo(uploadedVideo)
      }

      if (isEdit && product) {
        await updateProduct(product.id, result.data)
        toast.success(`"${result.data.name}" se ha actualizado`)
      } else {
        await createProduct(result.data)
        toast.success(`"${result.data.name}" se ha creado`)
      }
      router.push(adminRoutes.products)
    } catch (err) {
      // El backend valida otra vez con el mismo esquema. Si devuelve errores por
      // campo se muestran donde corresponde, igual que los del cliente.
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setErrors(err.fieldErrors as ProductFieldErrors)
        }
        toast.error(err.message)
      } else {
        toast.error(
          isEdit
            ? 'No se pudo guardar el producto'
            : 'No se pudo crear el producto',
        )
      }
      setIsSubmitting(false)
    }
  }

  const previewPrice = Number(price)
  const previewStock = Number(stock)

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          <FormSection
            title="Informacion del producto"
            description="Como se vera el producto en la tienda."
          >
            <Field label="Nombre del producto" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Camisa Chaos"
                maxLength={120}
                aria-invalid={Boolean(errors.name)}
                className="bg-card/60"
              />
            </Field>

            <Field
              label="Descripcion"
              htmlFor="description"
              error={errors.description}
              hint="Materiales, corte, medidas... lo que ayude a decidir la compra."
            >
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Camisa streetwear con estampado bold..."
                rows={5}
                maxLength={2000}
                aria-invalid={Boolean(errors.description)}
                className="resize-y bg-card/60"
              />
            </Field>
          </FormSection>

          <FormSection
            title={isPin ? 'Precio' : 'Precio e inventario'}
            description="Los importes se guardan en pesos, sin decimales."
          >
            <div
              className={
                isPin
                  ? 'grid grid-cols-1 gap-4'
                  : 'grid grid-cols-1 gap-4 sm:grid-cols-3'
              }
            >
              <Field label="Precio" htmlFor="price" error={errors.price}>
                <Input
                  id="price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="89900"
                  aria-invalid={Boolean(errors.price)}
                  className="bg-card/60"
                />
              </Field>

              {!isPin && (
                <>
                  <Field
                    label="Precio anterior"
                    htmlFor="oldPrice"
                    error={errors.oldPrice}
                    hint="Opcional"
                  >
                    <Input
                      id="oldPrice"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={oldPrice}
                      onChange={(event) => setOldPrice(event.target.value)}
                      placeholder="109900"
                      aria-invalid={Boolean(errors.oldPrice)}
                      className="bg-card/60"
                    />
                  </Field>

                  <Field label="Stock" htmlFor="stock" error={errors.stock}>
                    <Input
                      id="stock"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={stock}
                      onChange={(event) => setStock(event.target.value)}
                      placeholder="12"
                      aria-invalid={Boolean(errors.stock)}
                      className="bg-card/60"
                    />
                  </Field>
                </>
              )}
            </div>
          </FormSection>

          {!isPin && (
            <FormSection
              title="Variantes y ficha tecnica"
              description="Lo que la tienda muestra en la pagina del producto."
            >
              <Field label="Tallas" htmlFor="sizes" error={errors.sizes}>
                <TagInput
                  values={sizes}
                  onChange={setSizes}
                  placeholder={isFittedCap ? '7 1/4, 7 3/8...' : 'S, M, L...'}
                  suggestions={
                    isFittedCap ? FITTED_SIZE_SUGGESTIONS : SIZE_SUGGESTIONS
                  }
                  disabled={isSubmitting}
                  aria-label="Anadir talla"
                />
                {isFittedCap ? (
                  <>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Gorra cerrada: anade cada talla disponible (7 1/4, 7
                      3/8...). La Guia de tallas de la tienda la muestra a quien
                      calcule alguna de ellas.
                    </p>
                    {sizes.length === 0 && (
                      <p className="mt-1 text-xs text-amber-300/80">
                        Sin tallas, esta gorra no aparecera al usar la Guia de
                        tallas.
                      </p>
                    )}
                    {unknownSizes.length > 0 && (
                      <p className="mt-1 text-xs text-amber-300/80">
                        {unknownSizes.join(', ')}{' '}
                        {unknownSizes.length === 1 ? 'no es' : 'no son'} de la
                        tabla de tallas: la Guia de tallas no{' '}
                        {unknownSizes.length === 1 ? 'la' : 'las'} encontrara.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Dejalo vacio en gorras ajustables y pines: la tienda oculta
                    el selector.
                  </p>
                )}
              </Field>

              <Field label="Colores" htmlFor="colors" error={errors.colors}>
                <TagInput
                  values={colors}
                  onChange={setColors}
                  placeholder="Negro, Blanco..."
                  suggestions={COLOR_SUGGESTIONS}
                  disabled={isSubmitting}
                  aria-label="Anadir color"
                />
              </Field>

              <Field
                label="Etiqueta destacada"
                htmlFor="badge"
                error={errors.badge}
                hint='Opcional. Aparece sobre la foto: "Nuevo", "Popular", "Exclusivo".'
              >
                <Input
                  id="badge"
                  value={badge}
                  onChange={(event) => setBadge(event.target.value)}
                  placeholder="Nuevo"
                  maxLength={30}
                  aria-invalid={Boolean(errors.badge)}
                  className="bg-card/60"
                />
              </Field>

              <div>
                <Label className="mb-2">Ficha tecnica</Label>
                <DetailsEditor
                  rows={detailRows}
                  onChange={setDetailRows}
                  disabled={isSubmitting}
                  error={errors.details}
                />
              </div>
            </FormSection>
          )}

          <FormSection
            title="Imagenes"
            description={
              isPin
                ? 'Las imagenes se suben al servidor al guardar el producto.'
                : 'Todavia no se sube nada a ningun servidor: las imagenes solo se previsualizan en el navegador.'
            }
          >
            <ImageUploader
              label="Imagen principal"
              hint="Opcional si el producto tiene video."
              value={mainImage}
              onChange={setMainImage}
              max={1}
              error={errors.mainImage}
              disabled={isSubmitting}
            />

            <ImageUploader
              label="Imagenes adicionales"
              hint={`Hasta ${MAX_EXTRA_IMAGES} imagenes de apoyo (espalda, detalle, modelo).`}
              value={extraImages}
              onChange={setExtraImages}
              max={MAX_EXTRA_IMAGES}
              error={errors.images}
              disabled={isSubmitting}
            />
          </FormSection>

          <FormSection
            title="Video"
            description="Opcional. El producto puede tener solo imagenes, solo video o ambos. El video se sube al servidor al guardar el producto y se muestra en la galeria de la tienda."
          >
            <VideoUploader
              label="Video del producto"
              value={video}
              onChange={setVideo}
              error={errors.video}
              disabled={isSubmitting}
            />
          </FormSection>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Fija bajo la cabecera, pero sin superar el alto de la ventana: si
              no cabe, desplaza su propio contenido en lugar de quedar cortada. */}
          <div
            data-sticky-sidebar
            className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain"
          >
            <FormSection title="Organizacion">
              <Field
                label="Categoria"
                htmlFor="category"
                error={errors.categoryId}
              >
                <Select
                  value={categoryId}
                  onValueChange={(value) => setCategoryId(value as CategoryId)}
                >
                  <SelectTrigger id="category" className="w-full bg-card/60">
                    <SelectValue placeholder="Selecciona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {isCap && (
                <Field
                  label="Tipo de gorra"
                  htmlFor="capType"
                  error={errors.capTypeId}
                  hint="Filtro de la seccion Gorras en la tienda. Los tipos se administran en Gorras."
                >
                  <Select
                    value={capTypeId ?? NO_CAP_TYPE}
                    onValueChange={(value) =>
                      setCapTypeId(value === NO_CAP_TYPE ? null : value)
                    }
                  >
                    <SelectTrigger id="capType" className="w-full bg-card/60">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CAP_TYPE}>Sin tipo</SelectItem>
                      {capTypeOptions.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.isActive ? type.name : `${type.name} (inactivo)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field label="Estado" htmlFor="status" error={errors.status}>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ProductStatus)}
                >
                  <SelectTrigger id="status" className="w-full bg-card/60">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Los productos inactivos no se mostraran en la tienda publica.
                </p>
              </Field>
            </FormSection>

            {/* Vista previa */}
            <FormSection title="Vista previa">
              <div className="flex gap-3">
                {mainImage[0] ? (
                  <img
                    src={mainImage[0].url}
                    alt={name || 'Vista previa del producto'}
                    className="size-16 shrink-0 rounded-lg border border-border bg-secondary object-cover"
                  />
                ) : video ? (
                  // Sin imagen: la portada es un fotograma del video
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                    <VideoFrame
                      src={video.url}
                      label={name || 'Vista previa del producto'}
                      className="absolute inset-0 size-full"
                    />
                    <Film className="absolute bottom-1 right-1 size-3 text-white drop-shadow" />
                  </div>
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 text-[10px] text-muted-foreground">
                    Sin foto
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {name || 'Nombre del producto'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {categoryId ? labelFor(categoryId) : ''}
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {Number.isFinite(previewPrice) && previewPrice > 0
                      ? formatPrice(previewPrice)
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isPin && (
                  <StockBadge
                    stock={Number.isFinite(previewStock) ? previewStock : 0}
                  />
                )}
                <StatusBadge status={status} />
              </div>
            </FormSection>

            {/* Acciones */}
            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              {Object.keys(errors).length > 0 && (
                <p className="flex items-start gap-2 text-xs text-red-400">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Hay campos por corregir antes de guardar.
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isEdit ? 'Guardar cambios' : 'Guardar producto'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.push(adminRoutes.products)}
                className="w-full"
              >
                Cancelar
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Los cambios se guardan solo en memoria durante esta etapa.
              </p>
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
