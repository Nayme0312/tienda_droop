import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { HeroMediaType, type HeroSettings } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  badRequest,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import type { AdminHero } from '@/lib/admin/types'
import { HERO_ID } from '@/lib/hero/hero'

/** Rutas propias (/api/uploads/..., /images/...) o URLs http(s). */
const mediaUrl = z
  .string()
  .trim()
  .max(500, 'La URL es demasiado larga')
  .refine((url) => url.startsWith('/') || /^https?:\/\//i.test(url), {
    message: 'URL no valida',
  })
  .nullable()

const bodySchema = z.object({
  mediaType: z.enum(['video', 'image'], {
    errorMap: () => ({ message: 'Elige video o imagen' }),
  }),
  videoUrl: mediaUrl,
  imageUrl: mediaUrl,
  isActive: z.boolean({ required_error: 'Indica si el Hero esta activo' }),
})

function toAdminHero(row: HeroSettings): AdminHero {
  return {
    mediaType: row.mediaType === HeroMediaType.IMAGE ? 'image' : 'video',
    videoUrl: row.videoUrl,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * GET /api/admin/hero — configuracion del Hero de la portada.
 *
 * Si la fila aun no existe se devuelve un Hero vacio y desactivado.
 */
export async function GET() {
  try {
    await requireAdmin()

    const row = await prisma.heroSettings.findUnique({ where: { id: HERO_ID } })
    const empty: AdminHero = {
      mediaType: 'video',
      videoUrl: null,
      imageUrl: null,
      isActive: false,
      updatedAt: null,
    }
    return jsonOk(row ? toAdminHero(row) : empty)
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * PATCH /api/admin/hero — guarda el tipo de medio, los archivos y el estado.
 *
 * Video e imagen se conservan los dos aunque solo se muestre uno: asi se puede
 * alternar sin volver a subir nada. Lo que no se permite es dejar activo un
 * Hero cuyo medio elegido no tiene archivo.
 */
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const input = parseOrThrow(bodySchema, await readJsonBody(request))

    if (input.isActive) {
      if (input.mediaType === 'video' && !input.videoUrl) {
        throw badRequest('Sube un video o elige mostrar la imagen.', {
          videoUrl: 'Sube un video para el Hero',
        })
      }
      if (input.mediaType === 'image' && !input.imageUrl) {
        throw badRequest('Sube una imagen o elige mostrar el video.', {
          imageUrl: 'Sube una imagen para el Hero',
        })
      }
    }

    const data = {
      mediaType:
        input.mediaType === 'image' ? HeroMediaType.IMAGE : HeroMediaType.VIDEO,
      videoUrl: input.videoUrl,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
    }
    const row = await prisma.heroSettings.upsert({
      where: { id: HERO_ID },
      create: { id: HERO_ID, ...data },
      update: data,
    })

    return jsonOk(toAdminHero(row))
  } catch (error) {
    return toErrorResponse(error)
  }
}
