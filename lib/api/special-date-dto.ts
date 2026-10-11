import type { SpecialDate } from '@prisma/client'
import type { AdminSpecialDate } from '@/lib/admin/types'
import { getSeasonInfo, type SeasonSlug } from '@/lib/seasons/registry'

/** Fila de la base de datos -> lo que consume el panel. */
export function toAdminSpecialDate(row: SpecialDate): AdminSpecialDate {
  const slug = row.slug as SeasonSlug
  return {
    id: row.id,
    slug,
    name: row.name,
    description: getSeasonInfo(slug).description,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }
}
