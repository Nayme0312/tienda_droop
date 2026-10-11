import { API_ROUTES, api } from '@/lib/api/client'
import type {
  AdminOrder,
  AnalyticsQuery,
  AnalyticsReport,
  ManualSaleInput,
} from './types'

/**
 * Capa de servicios de ventas. Mismo patron que productos y pedidos.
 *
 *   registerSale(input)   ->  POST /api/admin/sales
 *   getAnalytics(query)   ->  GET  /api/admin/analytics?preset=&from=&to=
 */
export async function registerSale(input: ManualSaleInput): Promise<AdminOrder> {
  return api.post<AdminOrder>(API_ROUTES.sales, input)
}

export async function getAnalytics(query: AnalyticsQuery): Promise<AnalyticsReport> {
  const params = new URLSearchParams({ preset: query.preset })
  if (query.preset === 'custom' && query.from && query.to) {
    params.set('from', query.from)
    params.set('to', query.to)
  }
  return api.get<AnalyticsReport>(`${API_ROUTES.analytics}?${params.toString()}`)
}
