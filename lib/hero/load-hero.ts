import { connection } from 'next/server'
import { HeroMediaType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { DEFAULT_HERO_VIDEO, HERO_ID, type HeroMedia } from './hero'

/**
 * Medio del Hero para la tienda publica, o null si el Hero esta desactivado
 * (o le falta el archivo del tipo elegido).
 *
 * Se lee en cada peticion (`connection()`), asi que un cambio guardado en el
 * panel se ve en la siguiente carga de la portada.
 *
 * Nunca lanza: si la base de datos falla, la portada muestra el video de
 * siempre en lugar de quedarse sin Hero.
 */
export async function loadHeroMedia(): Promise<HeroMedia | null> {
  await connection()
  try {
    const row = await prisma.heroSettings.findUnique({ where: { id: HERO_ID } })
    if (!row) return { type: 'video', src: DEFAULT_HERO_VIDEO }
    if (!row.isActive) return null

    if (row.mediaType === HeroMediaType.IMAGE) {
      return row.imageUrl ? { type: 'image', src: row.imageUrl } : null
    }
    return row.videoUrl ? { type: 'video', src: row.videoUrl } : null
  } catch (error) {
    console.error('[hero] no se pudo leer la configuracion del Hero', error)
    return { type: 'video', src: DEFAULT_HERO_VIDEO }
  }
}
