import { connection } from 'next/server'
import { prisma } from '@/lib/db'
import { isSeasonSlug, type SeasonSlug } from './registry'

/**
 * Temporada activa en la tienda publica, o null si no hay ninguna.
 *
 * Se lee en cada peticion (`connection()`), asi que activar o desactivar una
 * fecha especial desde el panel se refleja en la siguiente carga de pagina.
 *
 * Nunca lanza: si la base de datos falla, la tienda se muestra con su diseno
 * normal en lugar de romperse por un detalle decorativo.
 */
export async function loadActiveSeason(): Promise<SeasonSlug | null> {
  await connection()
  try {
    const active = await prisma.specialDate.findFirst({
      where: { isActive: true },
      select: { slug: true },
      orderBy: { updatedAt: 'desc' },
    })
    return active && isSeasonSlug(active.slug) ? active.slug : null
  } catch (error) {
    console.error('[seasons] no se pudo leer la fecha especial activa', error)
    return null
  }
}
