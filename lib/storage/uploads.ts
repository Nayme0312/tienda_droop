import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

/**
 * Almacenamiento en disco de las imagenes y videos subidos desde el panel.
 *
 * Los archivos viven en <raiz del proyecto>/storage/uploads (ignorado por git)
 * con un nombre aleatorio (uuid + extension), y se sirven publicamente en
 * /api/uploads/<nombre>. Como el nombre nunca se reutiliza, el contenido de
 * una URL no cambia y se puede cachear indefinidamente.
 *
 * SEGURIDAD: el tipo declarado por el navegador no basta; se confirma con la
 * firma real del archivo (magic bytes). Al leer, el nombre se valida con una
 * expresion estricta para que nunca pueda salir de la carpeta de uploads.
 */

/** Limite de las imagenes (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Limite de los videos (50 MB). Debe coincidir con components/admin/video-uploader.tsx. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const UPLOADS_DIR = path.join(process.cwd(), 'storage', 'uploads')
const PUBLIC_PREFIX = '/api/uploads/'

type ImageFormat = 'png' | 'jpg' | 'webp' | 'gif' | 'avif'
type VideoFormat = 'mp4' | 'mov' | 'webm'

const IMAGE_MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const VIDEO_MIME_TO_FORMAT: Record<string, VideoFormat> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

const CONTENT_TYPES: Record<ImageFormat | VideoFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
}

const IMAGE_EXTENSIONS = new Set<string>(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'])
const VIDEO_EXTENSIONS = new Set<string>(['mp4', 'mov', 'webm'])

/** Nombre seguro: sin rutas, sin puntos extra, solo una extension conocida. */
const SAFE_FILE_NAME = /^[A-Za-z0-9_-]{1,128}\.([A-Za-z0-9]{2,5})$/

// ---------------------------------------------------------------------------
// Firmas (magic bytes)
// ---------------------------------------------------------------------------

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return ''
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, i) => bytes[i] === byte)
}

/** Formato real de una imagen segun su firma, o null si no es reconocida. */
function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg'
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return null
}

/** Contenedor real de un video segun su firma, o null si no es reconocido. */
function detectVideoContainer(bytes: Uint8Array): 'isobmff' | 'webm' | null {
  // WebM / Matroska: cabecera EBML.
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm'
  // MP4 y MOV (ISO base media / QuickTime): primer atomo en el byte 4.
  const atom = ascii(bytes, 4, 4)
  if (atom === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    // Una imagen AVIF tambien usa ftyp: no se acepta como video.
    if (brand === 'avif' || brand === 'avis') return null
    return 'isobmff'
  }
  if (atom === 'moov' || atom === 'mdat' || atom === 'wide' || atom === 'free') {
    return 'isobmff'
  }
  return null
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

async function writeUpload(bytes: Uint8Array, extension: string): Promise<string> {
  await mkdir(UPLOADS_DIR, { recursive: true })
  const fileName = `${randomUUID()}.${extension}`
  // 'wx': falla si el archivo ya existe; nunca sobrescribe otro upload.
  await writeFile(path.join(UPLOADS_DIR, fileName), bytes, { flag: 'wx' })
  return `${PUBLIC_PREFIX}${fileName}`
}

/**
 * Guarda una imagen y devuelve su URL publica, o null si el tipo declarado no
 * esta admitido o no coincide con la firma real del archivo.
 */
export async function saveImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) return null

  const declared = IMAGE_MIME_TO_FORMAT[mimeType.toLowerCase()]
  const detected = detectImageFormat(bytes)
  if (!declared || !detected || declared !== detected) return null

  return writeUpload(bytes, detected)
}

/**
 * Guarda un video (MP4, MOV o WEBM) y devuelve su URL publica, o null si el
 * tipo declarado no esta admitido o no coincide con la firma real.
 */
export async function saveVideo(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  if (bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) return null

  const declared = VIDEO_MIME_TO_FORMAT[mimeType.toLowerCase()]
  const container = detectVideoContainer(bytes)
  if (!declared || !container) return null
  if ((declared === 'webm') !== (container === 'webm')) return null

  return writeUpload(bytes, declared)
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

function extensionOf(fileName: string): string | null {
  const match = SAFE_FILE_NAME.exec(fileName)
  return match ? match[1].toLowerCase() : null
}

function resolveUpload(fileName: string): string | null {
  if (!extensionOf(fileName)) return null
  const fullPath = path.join(UPLOADS_DIR, fileName)
  // Defensa adicional: la ruta final debe seguir dentro de UPLOADS_DIR.
  if (path.dirname(fullPath) !== UPLOADS_DIR) return null
  return fullPath
}

function contentTypeFor(extension: string): string {
  if (extension === 'jpeg') return CONTENT_TYPES.jpg
  return CONTENT_TYPES[extension as ImageFormat | VideoFormat] ?? 'application/octet-stream'
}

/** Indica si el nombre corresponde a un video (se sirve por rangos). */
export function isVideoFile(fileName: string): boolean {
  const extension = extensionOf(fileName)
  return extension !== null && VIDEO_EXTENSIONS.has(extension)
}

/** Lee una imagen subida, o null si el nombre no es valido o no existe. */
export async function readImage(
  fileName: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const extension = extensionOf(fileName)
  if (!extension || !IMAGE_EXTENSIONS.has(extension)) return null

  const fullPath = resolveUpload(fileName)
  if (!fullPath) return null

  try {
    const bytes = await readFile(fullPath)
    return { bytes, contentType: contentTypeFor(extension) }
  } catch {
    return null
  }
}

export type OpenedVideo =
  | {
      kind: 'ok'
      stream: ReadableStream<Uint8Array>
      contentType: string
      start: number
      end: number
      size: number
      partial: boolean
    }
  | { kind: 'unsatisfiable'; size: number }

/**
 * Interpreta una cabecera Range de un solo rango ("bytes=a-b", "bytes=a-",
 * "bytes=-n"). Devuelve null si no hay cabecera o no se entiende (se sirve el
 * archivo completo) y 'unsatisfiable' si el rango cae fuera del archivo.
 */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | 'unsatisfiable' | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  if (rawStart === '') {
    // Sufijo: los ultimos n bytes.
    const suffix = Number(rawEnd)
    if (suffix === 0) return 'unsatisfiable'
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }

  const start = Number(rawStart)
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  if (start >= size || start > end) return 'unsatisfiable'
  return { start, end }
}

/**
 * Abre un video para servirlo, completo o por rangos. Devuelve null si el
 * nombre no es valido o el archivo no existe.
 */
export async function openVideo(
  fileName: string,
  rangeHeader: string | null,
): Promise<OpenedVideo | null> {
  const extension = extensionOf(fileName)
  if (!extension || !VIDEO_EXTENSIONS.has(extension)) return null

  const fullPath = resolveUpload(fileName)
  if (!fullPath) return null

  let size: number
  try {
    const info = await stat(fullPath)
    if (!info.isFile()) return null
    size = info.size
  } catch {
    return null
  }

  const range = parseRange(rangeHeader, size)
  if (range === 'unsatisfiable') return { kind: 'unsatisfiable', size }

  const start = range ? range.start : 0
  const end = range ? range.end : Math.max(0, size - 1)
  const nodeStream = createReadStream(fullPath, { start, end })

  return {
    kind: 'ok',
    stream: Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>,
    contentType: contentTypeFor(extension),
    start,
    end,
    size,
    partial: range !== null,
  }
}
