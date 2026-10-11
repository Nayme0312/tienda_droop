import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { SECTION_SLUG_PATTERN } from '@/lib/sections'
import {
  checkMediaRule,
  productInputSchema,
} from '@/lib/admin/product-schema'
import {
  assertSameOrigin,
  badRequest,
  conflict,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  buildImageRows,
  productInclude,
  sanitizeVideoUrl,
  productSearchWhere,
  slugify,
  toAdminProduct,
  toDbStatus,
} from '@/lib/api/product-dto'
import { loadRunningPromotions } from '@/lib/api/promotion-dto'
import { resolveProductCapTypeId } from '@/lib/api/cap-type-dto'

const MAX_LIMIT = 50

/**
 * GET /api/admin/products — listado completo para el panel.
 *
 * Acepta filtros por query (`search` por nombre o codigo, `category`, `status`,
 * `limit`) para que el dia que
 * el catalogo crezca se pueda filtrar en la base de datos. El panel, ademas,
 * sigue filtrando en cliente sobre la lista ya cargada para que la busqueda sea
 * instantanea.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')?.trim()
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    // `limit` lo usa el buscador de "Registrar venta": pide solo unos pocos
    // resultados en lugar del catalogo entero.
    const limitParam = Number(searchParams.get('limit'))
    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_LIMIT)
        : undefined

    const where: Prisma.ProductWhereInput = search
      ? productSearchWhere(search.slice(0, 120))
      : {}
    if (category && category !== 'all') {
      // Solo se valida el formato: una categoria inexistente devuelve [].
      if (!SECTION_SLUG_PATTERN.test(category)) {
        throw badRequest('Categoria no valida.')
      }
      where.category = { slug: category }
    }
    if (status && status !== 'all') {
      if (status !== 'active' && status !== 'inactive') {
        throw badRequest('Estado no valido.')
      }
      where.status = toDbStatus(status)
    }

    // Una sola consulta de promociones vigentes para todo el listado.
    const [products, runningPromotions] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        // El listado completo va por fecha. Una busqueda acotada, por codigo si
        // se escribieron digitos (la coincidencia exacta queda primera) y por
        // nombre en otro caso.
        orderBy: !limit
          ? { createdAt: 'desc' }
          : /^\d+$/.test(search ?? '')
            ? { code: 'asc' }
            : [{ name: 'asc' }, { code: 'asc' }],
        take: limit,
      }),
      loadRunningPromotions(),
    ])

    return jsonOk(
      products.map((product) => toAdminProduct(product, runningPromotions)),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

/** POST /api/admin/products — crea un producto. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const body = await readJsonBody(request)
    // Se valida con el MISMO esquema que usa el formulario: el servidor no da
    // por bueno nada de lo que llegue del navegador.
    const input = parseOrThrow(productInputSchema, body)

    const category = await prisma.category.findUnique({
      where: { slug: input.categoryId },
      select: { id: true },
    })
    if (!category) {
      throw badRequest('Categoria no valida.', {
        categoryId: 'Esa categoria no existe',
      })
    }

    // Una URL de video que no resuelve (blob:) se descarta; si era el unico
    // medio del producto, el producto se quedaria sin imagen ni video.
    const videoUrl = sanitizeVideoUrl(input.video)
    const mediaError = checkMediaRule({ ...input, video: videoUrl })
    if (mediaError) {
      throw badRequest(mediaError, { mainImage: mediaError })
    }

    const slug = slugify(input.name)
    const duplicate = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (duplicate) {
      throw conflict('Ya existe un producto con ese nombre.')
    }

    // Tipo de gorra: solo en la seccion gorras, y debe existir y estar activo.
    const capTypeId = await resolveProductCapTypeId({
      categorySlug: input.categoryId,
      requested: input.capTypeId,
    })

    const created = await prisma.product.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        oldPrice: input.oldPrice,
        stock: input.stock,
        status: toDbStatus(input.status),
        categoryId: category.id,
        sizes: input.sizes,
        colors: input.colors,
        badge: input.badge,
        details: input.details,
        videoUrl,
        capTypeId,
        images: {
          create: buildImageRows(input.mainImage, input.images, input.name),
        },
      },
      include: productInclude,
    })

    return jsonCreated(toAdminProduct(created, await loadRunningPromotions()))
  } catch (error) {
    return toErrorResponse(error)
  }
}
