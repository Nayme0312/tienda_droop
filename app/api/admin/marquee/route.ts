import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { toAdminMarquee } from '@/lib/api/marquee-dto'
import { MARQUEE_ID, MARQUEE_MAX_LENGTH } from '@/lib/marquee/marquee'

const bodySchema = z.object({
  text: z
    .string({ required_error: 'Escribe el texto de la cinta' })
    .trim()
    .min(1, 'Escribe el texto de la cinta')
    .max(
      MARQUEE_MAX_LENGTH,
      `El texto no puede superar los ${MARQUEE_MAX_LENGTH} caracteres`,
    ),
  isActive: z.boolean({ required_error: 'Indica si la cinta esta activa' }),
})

/**
 * GET /api/admin/marquee — configuracion de la cinta marquesina.
 *
 * Si la fila aun no existe (migracion sin aplicar o borrada a mano) se
 * devuelve una cinta vacia y desactivada, que es lo que ve la tienda.
 */
export async function GET() {
  try {
    await requireAdmin()

    const row = await prisma.storeMarquee.findUnique({
      where: { id: MARQUEE_ID },
    })

    return jsonOk(
      row
        ? toAdminMarquee(row)
        : { text: '', defaultText: '', isActive: false, updatedAt: null },
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * PATCH /api/admin/marquee — guarda el texto y el estado de la cinta.
 *
 * La plantilla predeterminada (defaultText) no se acepta en el cuerpo: zod
 * descarta la clave, asi que guardar nunca la modifica.
 */
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const data = parseOrThrow(bodySchema, await readJsonBody(request))

    const row = await prisma.storeMarquee.upsert({
      where: { id: MARQUEE_ID },
      create: { id: MARQUEE_ID, ...data },
      update: data,
    })

    return jsonOk(toAdminMarquee(row))
  } catch (error) {
    return toErrorResponse(error)
  }
}
