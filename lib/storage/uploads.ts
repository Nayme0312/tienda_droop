import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Almacenamiento local de las imagenes que se suben desde el panel.
 *
 * Los archivos se guardan en `storage/uploads/` (fuera de `public/`, porque Next
 * solo sirve lo que habia en `public/` al compilar) y se sirven con el route
 * handler GET /api/uploads/:file. La URL que se guarda en ProductImage es esa
 * ruta relativa, que `sanitizeImageUrl` ya acepta.
 */
export const UPLOADS_DIR = path.join(process.cwd(), 'storage', 'uploads')
export const UPLOADS_PUBLIC_PATH = '/api/uploads'
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Limite de los videos. Debe caber en proxyClientMaxBodySize (next.config.mjs). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

/** Tipos admitidos, con la extension con la que se guardan. */
export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

/** Videos admitidos. MOV es el formato que graba el iPhone. */
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries({ ...IMAGE_TYPES, ...VIDEO_TYPES }).map(([type, ext]) => [
    ext,
    type,
  ]),
)

/** Nombre generado por saveImage/saveVideo: uuid + extension conocida. */
const FILE_NAME_PATTERN =
  /^[0-9a-f-]{36}\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/

const VIDEO_EXTENSIONS = new Set(Object.values(VIDEO_TYPES))

/**
 * Comprueba la firma real del archivo: el `type` del File lo decide el
 * navegador y no basta para fiarse del contenido.
 */
function matchesSignature(bytes: Uint8Array, ext: string): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end))
  switch (ext) {
    case 'jpg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'png':
      return ascii(1, 4) === 'PNG'
    case 'gif':
      return ascii(0, 4) === 'GIF8'
    case 'webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    // AVIF, MP4 y MOV comparten contenedor ISO: caja 'ftyp' en el byte 4.
    case 'avif':
    case 'mp4':
    case 'mov':
      return ascii(4, 8) === 'ftyp'
    case 'webm':
      return (
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
      )
    default:
      return false
  }
}

/** Guarda la imagen y devuelve la URL con la que se sirve. */
export async function saveImage(
  bytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  return saveFile(bytes, IMAGE_TYPES[contentType])
}

/** Guarda el video y devuelve la URL con la que se sirve. */
export async function saveVideo(
  bytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  return saveFile(bytes, VIDEO_TYPES[contentType])
}

async function saveFile(
  bytes: Uint8Array,
  ext: string | undefined,
): Promise<string | null> {
  if (!ext || !matchesSignature(bytes, ext)) return null

  const fileName = `${randomUUID()}.${ext}`
  await mkdir(UPLOADS_DIR, { recursive: true })
  await writeFile(path.join(UPLOADS_DIR, fileName), bytes)
  return `${UPLOADS_PUBLIC_PATH}/${fileName}`
}

/** Lee una imagen subida. null si el nombre no es valido o no existe. */
export async function readImage(
  fileName: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  // Solo nombres generados por saveImage: evita rutas como "../.env".
  if (!FILE_NAME_PATTERN.test(fileName)) return null
  const ext = fileName.split('.').pop() as string
  try {
    const bytes = await readFile(path.join(UPLOADS_DIR, fileName))
    return { bytes, contentType: CONTENT_TYPES[ext] }
  } catch {
    return null
  }
}

/** true si el nombre corresponde a un video subido. */
export function isVideoFile(fileName: string): boolean {
  return (
    FILE_NAME_PATTERN.test(fileName) &&
    VIDEO_EXTENSIONS.has(fileName.split('.').pop() as string)
  )
}

export type OpenedVideo =
  | { kind: 'unsatisfiable'; size: number }
  | {
      kind: 'ok'
      stream: ReadableStream<Uint8Array>
      contentType: string
      size: number
      start: number
      end: number
      /** true si se pidio un rango: la respuesta es 206. */
      partial: boolean
    }

/**
 * Abre un video subido para servirlo, entero o por rangos ("Range: bytes=a-b").
 *
 * Los navegadores piden los videos por trozos para poder avanzar y empezar a
 * reproducir sin descargarlos enteros, y Safari en iPhone no los reproduce si
 * el servidor no responde 206 a esas peticiones. Se lee del disco en
 * streaming, sin cargar el archivo entero en memoria.
 *
 * null si el nombre no es valido o el archivo no existe.
 */
export async function openVideo(
  fileName: string,
  rangeHeader: string | null,
): Promise<OpenedVideo | null> {
  if (!isVideoFile(fileName)) return null
  const filePath = path.join(UPLOADS_DIR, fileName)

  let size: number
  try {
    size = (await stat(filePath)).size
  } catch {
    return null
  }

  let start = 0
  let end = size - 1
  let partial = false

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
    if (!match || (match[1] === '' && match[2] === '')) {
      return { kind: 'unsatisfiable', size }
    }
    const [, from, to] = match
    if (from === '') {
      // "bytes=-500": los ultimos 500 bytes.
      start = Math.max(0, size - Number(to))
    } else {
      start = Number(from)
      if (to !== '') end = Math.min(Number(to), size - 1)
    }
    if (start > end || start >= size) return { kind: 'unsatisfiable', size }
    partial = true
  }

  const ext = fileName.split('.').pop() as string
  return {
    kind: 'ok',
    stream: Readable.toWeb(
      createReadStream(filePath, { start, end }),
    ) as ReadableStream<Uint8Array>,
    contentType: CONTENT_TYPES[ext],
    size,
    start,
    end,
    partial,
  }
}
