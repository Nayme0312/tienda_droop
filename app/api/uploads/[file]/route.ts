import type { NextRequest } from 'next/server'
import { isVideoFile, openVideo, readImage } from '@/lib/storage/uploads'

type RouteContext = { params: Promise<{ file: string }> }

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'

/**
 * GET /api/uploads/:file — sirve las imagenes y videos subidos desde el panel.
 *
 * Es publico: la tienda los muestra. El nombre es un uuid, asi que el
 * contenido no cambia nunca y se puede cachear indefinidamente.
 *
 * Los videos se sirven por rangos (206 Partial Content), que es como los
 * piden los navegadores para empezar a reproducir y poder avanzar.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { file } = await params

  if (isVideoFile(file)) {
    const video = await openVideo(file, request.headers.get('range'))
    if (!video) {
      return Response.json({ error: 'Video no encontrado.' }, { status: 404 })
    }
    if (video.kind === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${video.size}` },
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': video.contentType,
      'Content-Length': String(video.end - video.start + 1),
      'Accept-Ranges': 'bytes',
      'Cache-Control': IMMUTABLE_CACHE,
      'X-Content-Type-Options': 'nosniff',
    }
    if (video.partial) {
      headers['Content-Range'] = `bytes ${video.start}-${video.end}/${video.size}`
    }
    return new Response(video.stream, {
      status: video.partial ? 206 : 200,
      headers,
    })
  }

  const image = await readImage(file)
  if (!image) {
    return Response.json({ error: 'Imagen no encontrada.' }, { status: 404 })
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': IMMUTABLE_CACHE,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
