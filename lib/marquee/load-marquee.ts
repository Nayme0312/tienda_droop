import { connection } from 'next/server'
import { prisma } from '@/lib/db'
import { MARQUEE_ID } from './marquee'

/**
 * Texto de la cinta marquesina para la tienda publica, o null si esta
 * desactivada, vacia o no existe.
 *
 * Se lee en cada peticion (`connection()`), asi que un cambio guardado en el
 * panel se ve en la siguiente carga de la portada.
 *
 * Nunca lanza: si la base de datos falla, la portada se muestra sin la cinta
 * en lugar de romperse.
 */
export async function loadMarqueeText(): Promise<string | null> {
  await connection()
  try {
    const row = await prisma.storeMarquee.findUnique({
      where: { id: MARQUEE_ID },
      select: { text: true, isActive: true },
    })
    if (!row || !row.isActive) return null
    const text = row.text.trim()
    return text || null
  } catch (error) {
    console.error('[marquee] no se pudo leer la cinta marquesina', error)
    return null
  }
}
