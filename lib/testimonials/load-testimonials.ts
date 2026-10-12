import { connection } from 'next/server'
import { prisma } from '@/lib/db'
import { testimonialSelect, toPublicTestimonial } from '@/lib/api/testimonial-dto'
import { STORE_TESTIMONIALS_LIMIT, type PublicTestimonial } from './testimonials'

/**
 * Testimonios activos para la portada, del mas reciente al mas antiguo.
 *
 * Se lee en cada peticion (`connection()`), asi que crear, editar o
 * desactivar uno en el panel se ve en la siguiente carga.
 *
 * Nunca lanza: si la base de datos falla, la portada se muestra sin la seccion
 * en lugar de romperse.
 */
export async function loadTestimonials(): Promise<PublicTestimonial[]> {
  await connection()
  try {
    const rows = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
      take: STORE_TESTIMONIALS_LIMIT,
      select: testimonialSelect,
    })
    return rows.map(toPublicTestimonial)
  } catch (error) {
    console.error('[testimonials] no se pudieron leer los testimonios', error)
    return []
  }
}
