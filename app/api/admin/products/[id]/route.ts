import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  checkMediaRule,
  checkOldPriceRule,
  productPatchSchema,
} from '@/lib/admin/product-schema'
import {
  assertSameOrigin,
  badRequest,
  conflict,
  jsonNoContent,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  buildImageRows,
  productInclude,
  sanitizeVideoUrl,
  slugify,
  toAdminProduct,
  toDbStatus,
} from '@/lib/api/product-dto'
import { loadRunningPromotions } from '@/lib/api/promotion-dto'
import { resolveProductCapTypeId } from '@/lib/api/cap-type-dto'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/admin/products/:id */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    })
    if (!product) throw notFound('Producto no encontrado.')

    return jsonOk(toAdminProduct(product, await loadRunningPromotions()))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * PATCH /api/admin/products/:id — actualizacion parcial.
 *
 * Solo se tocan los campos presentes en el cuerpo. La regla "precio anterior >
 * precio" se comprueba despues de fusionar con lo que ya hay en la base de
 * datos, porque el cuerpo puede traer solo uno de los dos.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const body = await readJsonBody(request)
    const input = parseOrThrow(productPatchSchema, body)

    const current = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    })
    if (!current) throw notFound('Producto no encontrado.')

    const nextPrice = input.price ?? current.price
    const nextOldPrice =
      input.oldPrice !== undefined ? input.oldPrice : current.oldPrice
    const oldPriceError = checkOldPriceRule({
      price: nextPrice,
      oldPrice: nextOldPrice,
    })
    if (oldPriceError) {
      throw badRequest(oldPriceError, { oldPrice: oldPriceError })
    }

    // Categoria: del slug del DTO al id real de la tabla.
    let categoryId = current.categoryId
    const nextCategorySlug = input.categoryId || current.category.slug
    if (input.categoryId && input.categoryId !== current.category.slug) {
      const category = await prisma.category.findUnique({
        where: { slug: input.categoryId },
        select: { id: true },
      })
      if (!category) {
        throw badRequest('Categoria no valida.', {
          categoryId: 'Esa categoria no existe',
        })
      }
      categoryId = category.id
    }

    // Tipo de gorra: se borra si el producto deja de ser una gorra.
    const capTypeId = await resolveProductCapTypeId({
      categorySlug: nextCategorySlug,
      requested: input.capTypeId,
      current: current.capTypeId,
    })

    // El slug sigue al nombre. Si otro producto ya lo ocupa, 409.
    let slug = current.slug
    if (input.name && input.name !== current.name) {
      slug = slugify(input.name)
      if (slug !== current.slug) {
        const duplicate = await prisma.product.findUnique({
          where: { slug },
          select: { id: true },
        })
        if (duplicate && duplicate.id !== id) {
          throw conflict('Ya existe otro producto con ese nombre.')
        }
      }
    }

    // Las imagenes se reemplazan en bloque (el formulario envia el conjunto
    // completo), dentro de una transaccion junto con el resto de los campos.
    const replaceImages =
      input.mainImage !== undefined || input.images !== undefined
    const nextMainImage = input.mainImage ?? current.images.find((i) => i.isPrimary)?.url ?? ''
    const nextImages =
      input.images ??
      current.images.filter((i) => !i.isPrimary).map((i) => i.url)
    const nextName = input.name ?? current.name

    // Video: undefined = no se toca; null = se quita; string = se cambia.
    const nextVideo =
      input.video !== undefined ? sanitizeVideoUrl(input.video) : current.videoUrl
    const mediaError = checkMediaRule({
      mainImage: nextMainImage,
      images: nextImages,
      video: nextVideo,
    })
    if (mediaError) {
      throw badRequest(mediaError, { mainImage: mediaError })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (replaceImages) {
        await tx.productImage.deleteMany({ where: { productId: id } })
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name, slug }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.oldPrice !== undefined && { oldPrice: input.oldPrice }),
          ...(input.stock !== undefined && { stock: input.stock }),
          ...(input.status !== undefined && {
            status: toDbStatus(input.status),
          }),
          ...(input.sizes !== undefined && { sizes: input.sizes }),
          ...(input.colors !== undefined && { colors: input.colors }),
          ...(input.badge !== undefined && { badge: input.badge }),
          ...(input.details !== undefined && { details: input.details }),
          ...(input.video !== undefined && { videoUrl: nextVideo }),
          ...(categoryId !== current.categoryId && { categoryId }),
          ...(capTypeId !== current.capTypeId && { capTypeId }),
          ...(replaceImages && {
            images: {
              create: buildImageRows(nextMainImage, nextImages, nextName),
            },
          }),
        },
        include: productInclude,
      })
    })

    return jsonOk(toAdminProduct(updated, await loadRunningPromotions()))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/products/:id
 *
 * Las filas de ProductImage caen por `onDelete: Cascade`. En la etapa 3, antes
 * de este borrado habra que eliminar los ficheros del almacenamiento real: el
 * punto exacto donde hacerlo es justo aqui, antes del delete.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) throw notFound('Producto no encontrado.')

    // TODO (etapa 3): borrar aqui los ficheros de las imagenes del
    // almacenamiento antes de eliminar el producto.
    await prisma.product.delete({ where: { id } })

    return jsonNoContent()
  } catch (error) {
    return toErrorResponse(error)
  }
}
