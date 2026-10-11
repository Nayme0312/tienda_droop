import { prisma } from '@/lib/db'
import { isSeasonSlug } from '@/lib/seasons/registry'
import { jsonOk, requireAdmin, toErrorResponse } from '@/lib/api/http'
import { toAdminSpecialDate } from '@/lib/api/special-date-dto'

/**
 * GET /api/admin/special-dates — fechas especiales para el panel.
 *
 * Solo se devuelven las que la tienda sabe pintar (lib/seasons/registry.ts):
 * una fila sin tema no tendria ningun efecto al activarla.
 */
export async function GET() {
  try {
    await requireAdmin()

    const rows = await prisma.specialDate.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return jsonOk(
      rows.filter((row) => isSeasonSlug(row.slug)).map(toAdminSpecialDate),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
