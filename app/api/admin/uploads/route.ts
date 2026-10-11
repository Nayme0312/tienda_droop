import type { NextRequest } from 'next/server'
import {
  assertSameOrigin,
  badRequest,
  jsonCreated,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import {
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
  saveImage,
  saveVideo,
} from '@/lib/storage/uploads'

/**
 * POST /api/admin/uploads — sube una imagen o un video de producto.
 *
 * Recibe multipart/form-data con un campo `file` y responde 201 con
 * `{ url }`, la ruta definitiva que el formulario guarda en el producto. El
 * tipo se decide por el `type` del archivo y se confirma con su firma real.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      throw badRequest('La peticion debe ser multipart/form-data.')
    }

    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      throw badRequest('No se ha recibido ningun archivo.')
    }

    if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_BYTES) {
        throw badRequest('El video no puede superar los 50 MB.')
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const url = await saveVideo(bytes, file.type)
      if (!url) {
        throw badRequest('Formato de video no admitido. Usa MP4, MOV o WEBM.')
      }
      return jsonCreated({ url })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw badRequest('La imagen no puede superar los 5 MB.')
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const url = await saveImage(bytes, file.type)
    if (!url) {
      throw badRequest('Formato no admitido. Usa PNG, JPG, WEBP, GIF o AVIF.')
    }

    return jsonCreated({ url })
  } catch (error) {
    return toErrorResponse(error)
  }
}
