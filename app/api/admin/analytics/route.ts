import type { NextRequest } from 'next/server'
import { jsonOk, requireAdmin, toErrorResponse } from '@/lib/api/http'
import { buildAnalyticsReport, resolveRange } from '@/lib/sales/analytics'

/**
 * GET /api/admin/analytics?preset=month — informe de ventas del Dashboard.
 *
 * `preset`: today | 7d | 30d | month | prev-month | custom. Con `custom` hay
 * que enviar `from` y `to` ("YYYY-MM-DD", ambos inclusive).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const params = request.nextUrl.searchParams
    const range = resolveRange(
      params.get('preset'),
      params.get('from'),
      params.get('to'),
    )

    return jsonOk(await buildAnalyticsReport(range))
  } catch (error) {
    return toErrorResponse(error)
  }
}
