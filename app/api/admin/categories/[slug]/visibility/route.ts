import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  notFound,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { loadAdminSection } from '@/lib/api/section-dto'

/** Cuerpo opcional: sin el, se invierte la visibilidad actual. */
const visibilitySchema = z.object({
  isVisible: z.boolean().optional(),
})

/**
 * PATCH /api/admin/categories/:slug/visibility
 *
 * Muestra u oculta una seccion de tienda. Ocultarla NO borra ni desactiva nada:
 * la categoria y sus productos siguen intactos y gestionables desde el panel;
 * solo dejan de mostrarse al cliente.
 *
 * Se identifica por slug, igual que en el resto de la API, donde el slug es el
 * identificador estable de la categoria.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const { slug } = await params

    let body: unknown = {}
    try {
      const text = await request.text()
      if (text.trim()) body = JSON.parse(text)
    } catch {
      body = {}
    }
    const { isVisible } = parseOrThrow(visibilitySchema, body)

    const current = await prisma.category.findUnique({
      where: { slug },
      select: { isVisible: true },
    })
    if (!current) throw notFound('Seccion no encontrada.')

    await prisma.category.update({
      where: { slug },
      data: { isVisible: isVisible ?? !current.isVisible },
    })

    return jsonOk(await loadAdminSection(slug))
  } catch (error) {
    return toErrorResponse(error)
  }
}
