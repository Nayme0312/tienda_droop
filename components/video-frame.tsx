import { cn } from "@/lib/utils"

/** Segundo del que se toma el fotograma de portada. */
const FRAME_AT_SECONDS = 0.1

/**
 * Miniatura de un video: muestra un fotograma fijo, sin reproducirlo nunca.
 *
 * Se usa como portada de los productos que tienen video pero ninguna imagen
 * (tarjeta, carrito, checkout y panel), para que no aparezca un cuadro vacio.
 *
 *  - El fragmento `#t=` hace que el navegador pinte ese fotograma en lugar de
 *    un cuadro negro; es tambien lo que lo hace funcionar en iOS Safari.
 *  - Sin `autoPlay` ni controles y con `preload="metadata"`: solo se descarga
 *    lo necesario para el fotograma (los videos se sirven por rangos).
 *  - Ignora el puntero para que el clic llegue a la tarjeta o el boton padre.
 */
export function VideoFrame({
  src,
  label,
  className,
}: {
  src: string
  /** Texto alternativo; sin el, la miniatura es decorativa. */
  label?: string
  className?: string
}) {
  const url = `${src.split("#")[0]}#t=${FRAME_AT_SECONDS}`

  return (
    <video
      src={url}
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("pointer-events-none bg-accent object-cover", className)}
    />
  )
}
