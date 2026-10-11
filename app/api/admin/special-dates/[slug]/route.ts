import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { isSeasonSlug } from '@/lib/seasons/registry'
import {
  assertSameOrigin,
  badRequest,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { toAdminSpecialDate } from '@/lib/api/special-date-dto'

const bodySchema = z.object({
  isActive: z.boolean({ required_error: 'Indica si se activa o se desactiva' }),
})

/**
 * PATCH /api/admin/special-dates/:slug — activa o desactiva una temporada.
 *
 * Solo puede haber una activa: al activar una, las demas se desactivan en la
 * misma transaccion, para que la tienda nunca mezcle dos temas.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const { slug } = await params
    if (!isSeasonSlug(slug)) throw badRequest('Fecha especial no valida.')

    const { isActive } = parseOrThrow(bodySchema, await readJsonBody(request))

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.specialDate.findUnique({ where: { slug } })
      if (!current) throw notFound('Fecha especial no encontrada.')

      if (isActive) {
        await tx.specialDate.updateMany({
          where: { isActive: true, slug: { not: slug } },
          data: { isActive: false },
        })
      }
      return tx.specialDate.update({ where: { slug }, data: { isActive } })
    })

    return jsonOk(toAdminSpecialDate(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}
