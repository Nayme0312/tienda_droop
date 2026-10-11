import type { StoreMarquee } from '@prisma/client'
import type { AdminMarquee } from '@/lib/admin/types'

/** Fila de la base de datos -> lo que consume el panel. */
export function toAdminMarquee(row: StoreMarquee): AdminMarquee {
  return {
    text: row.text,
    defaultText: row.defaultText,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }
}
