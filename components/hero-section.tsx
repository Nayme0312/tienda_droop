"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import type { HeroMedia } from "@/lib/hero/hero"
import { TextParticle } from "@/components/ui/text-particle"

/**
 * Encuadre del fondo, compartido por el video y la imagen: los dos ocupan
 * exactamente el mismo recuadro en todas las resoluciones (ver la nota sobre
 * hero-stack mas abajo).
 */
const MEDIA_CLASS =
  "absolute inset-0 h-full w-full object-cover object-center contrast-[1.05] saturate-[1.05] hero-stack:bottom-auto hero-stack:left-auto hero-stack:top-[calc(4.5rem-18vw)] hero-stack:aspect-video hero-stack:h-auto hero-stack:w-[160vw] hero-stack:max-w-none hero-tight:top-[calc(4.5rem-15.75vw)] hero-tight:w-[140vw] hero-stack:[mask-image:linear-gradient(to_bottom,black_75%,transparent)] dark:hero-stack:[mask-image:none]"

/**
 * Hero de la portada. El medio (video o imagen) se administra desde el panel
 * (Sistema > Hero de portada) y llega ya resuelto desde el servidor.
 */
export function HeroSection({ media }: { media: HeroMedia }) {
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Con imagen no hay nada que sincronizar con el scroll
    if (media.type !== "video") return
    const section = sectionRef.current
    const sticky = stickyRef.current
    const video = videoRef.current
    if (!section || !sticky || !video) return

    let frame = 0
    let target = 0
    let current = 0

    // Progreso 0..1 mientras el Hero esta fijado (sticky): 0 con el Hero
    // arriba del todo, 1 justo cuando se suelta y la pagina sigue bajando.
    // Asi la animacion se completa entera antes de continuar el scroll
    const readProgress = () => {
      const rect = section.getBoundingClientRect()
      // Se mide contra la capa fijada (h-svh) y no contra innerHeight: en
      // movil innerHeight cambia al ocultarse la barra del navegador y hacia
      // saltar el video en mitad del scroll
      const distance = rect.height - sticky.offsetHeight
      if (distance <= 0) return 0
      return Math.min(Math.max(-rect.top / distance, 0), 1)
    }

    const tick = () => {
      frame = 0
      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      // Interpolacion suave hacia el objetivo para evitar saltos
      current += (target - current) * 0.2
      if (Math.abs(target - current) < 0.0005) current = target

      const time = current * duration
      if (!video.seeking && Math.abs(video.currentTime - time) > 0.001) {
        video.currentTime = time
      }

      if (current !== target || video.seeking) {
        frame = requestAnimationFrame(tick)
      }
    }

    const schedule = () => {
      target = readProgress()
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const onReady = () => {
      video.pause()
      // Arranca sincronizado con la posicion actual del scroll (p. ej. al
      // recargar la pagina a mitad del Hero)
      current = target = readProgress()
      if (Number.isFinite(video.duration)) {
        video.currentTime = current * video.duration
      }
    }

    // iOS Safari no pinta frames al cambiar currentTime hasta que el video
    // se ha "activado" una vez; se reproduce y pausa de inmediato
    const prime = video.play()
    if (prime) prime.then(onReady).catch(() => {})

    if (video.readyState >= 1) onReady()
    video.addEventListener("loadedmetadata", onReady)
    video.addEventListener("seeked", schedule)
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      video.removeEventListener("loadedmetadata", onReady)
      video.removeEventListener("seeked", schedule)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [media.type, media.src])

  return (
    <section
      ref={sectionRef}
      // El fondo animado de la tienda (KineticGrid) no se pinta bajo el Hero
      data-kinetic-grid-exclude
      // La altura extra solo hace falta para recorrer el video con el scroll;
      // con imagen el Hero ocupa una pantalla y la pagina sigue sin pausa
      className={
        media.type === "video" ? "relative h-[260svh] md:h-[300svh]" : "relative h-svh"
      }
    >
      {/* Capa fijada: el Hero se queda en pantalla mientras el scroll recorre
          la altura extra de la seccion y avanza el video */}
      {/* En vertical (hero-stack) el texto se centra en el hueco que queda
          bajo la gorra: 4.5rem de navbar + 58vw del recuadro del video */}
      <div
        ref={stickyRef}
        className="sticky top-0 flex h-svh items-center overflow-hidden pt-20 pb-16 hero-stack:pt-[calc(4.5rem+58vw)] hero-stack:pb-20 hero-tight:pt-[calc(4.5rem+50vw)] hero-tight:pb-14 hero-short:pt-16 hero-short:pb-10"
      >
      {/* Background Image */}
      <div className="absolute inset-0 bg-black">
        {/* Video controlado por scroll: permanece pausado y solo cambia su
            currentTime segun el progreso del scroll dentro del Hero. Cubre
            todo el Hero (sin escalado) para no dejar bandas del fondo.
            videohero1-scroll.mp4 es videohero1.mp4 recodificado con un
            keyframe por frame: sin eso, en movil cada salto hacia atras
            decodificaba desde el inicio y el scroll daba tirones.
            En vertical el recuadro se agranda a 160vw anclado a la derecha
            (la gorra ocupa ~57-100% del ancho y ~25-83% del alto del video y
            toca el borde derecho del original) y se sube un 18vw para que la
            gorra empiece justo bajo el navbar. En modo claro no hay velo, y
            cuando el polvo de la explosion llega al borde inferior del
            recuadro se veia un corte a media pantalla: una mascara funde ese
            borde con el fondo negro (en oscuro ya lo tapa el velo).
            Con imagen se usa el mismo recuadro, sin animacion de scroll */}
        {media.type === "video" ? (
          <video
            key={media.src}
            ref={videoRef}
            src={media.src}
            aria-label="Streetwear clothing on rack"
            className={MEDIA_CLASS}
            muted
            playsInline
            preload="auto"
          />
        ) : (
          <img
            key={media.src}
            src={media.src}
            alt="Streetwear clothing on rack"
            className={MEDIA_CLASS}
            fetchPriority="high"
          />
        )}
        {/* Velo solo en modo oscuro; en modo claro el video queda limpio.
            En vertical sube desde abajo para no tapar la gorra */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background/90 via-background/60 to-background/20 dark:block md:via-background/50 md:to-transparent hero-stack:bg-gradient-to-t hero-stack:via-background/20! hero-stack:to-transparent!" />
        {/* Fundido inferior hacia el fondo de la pagina en ambos modos: al
            soltarse el Hero su borde ya es del color de la siguiente seccion.
            En claro es mas alto porque el salto de negro a claro es mayor */}
        <div className="hero-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 h-32 md:h-48 dark:h-24 dark:md:h-32" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mb-4 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground hero-stack:mb-3 hero-stack:text-white/70 dark:hero-stack:text-muted-foreground hero-tight:mb-2 hero-short:mb-2"
          >
            AUTHENTIC STYLE
            {/* Texto en particulas: copia la tipografia y el color de este
                elemento y reacciona al cursor (o al toque en movil) */}
            <TextParticle />
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 text-balance"
          >
            {/* Escala ajustada al largo de esta frase: con la escala anterior
                (pensada para "TE DEFINE.") el remate se partia en dos lineas */}
            {/* Hover: desplazamiento leve + halo suave (solo transform y
                text-shadow, sin recalcular el layout) */}
            <span className="relative block w-fit text-2xl font-light italic tracking-tight text-white/90 [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] transition-[translate,scale,color,text-shadow] duration-500 ease-out hover:translate-x-1.5 hover:text-white hover:[text-shadow:0_0_22px_rgb(255_255_255/0.35),0_2px_12px_rgb(0_0_0/0.45)] dark:text-foreground/60 dark:[text-shadow:none] dark:hover:text-foreground/90 dark:hover:[text-shadow:0_0_22px_rgb(255_255_255/0.2)] motion-reduce:transition-none motion-reduce:hover:translate-x-0 min-[390px]:text-3xl md:text-5xl hero-short:text-xl!">
              AQUÍ HASTA EL MÁS FEO
              <TextParticle />
            </span>
            <span className="relative block w-fit text-4xl font-black tracking-tighter text-white [text-shadow:0_2px_16px_rgb(0_0_0/0.45)] transition-[translate,scale,text-shadow] duration-500 ease-out hover:-translate-y-0.5 hover:[text-shadow:0_0_32px_rgb(255_255_255/0.4),0_2px_16px_rgb(0_0_0/0.45)] dark:text-foreground dark:[text-shadow:none] dark:hover:[text-shadow:0_0_32px_rgb(255_255_255/0.25)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[360px]:text-5xl md:text-7xl lg:text-8xl hero-short:text-4xl!">
              QUEDA BIEN.
              <TextParticle />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            // En vertical el parrafo queda sobre negro puro: en modo claro el
            // gris de muted-foreground apenas se leia
            className="relative mb-8 max-w-md text-base text-muted-foreground leading-relaxed md:text-lg hero-stack:mb-6 hero-stack:text-white/75 dark:hero-stack:text-muted-foreground hero-tight:mb-4 hero-short:mb-4 hero-short:text-sm!"
          >
            Gorras y camisas para armar tu outfit. Calidad real sin rodeos.
            <TextParticle />
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 hero-stack:flex-row hero-stack:flex-wrap"
          >
            <Link
              href="#catalogo"
              // El hover ya no pasa a transparente: sobre el video el texto
              // quedaba del mismo tono que el fondo. En claro invierte a
              // blanco/negro; en oscuro a cristal oscuro con texto blanco
              className="group flex w-full items-center justify-center gap-3 rounded-sm border border-foreground bg-foreground px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-background shadow-lg shadow-black/20 transition-[translate,scale,background-color,color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black hover:shadow-xl hover:shadow-black/30 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black dark:hover:border-white dark:hover:bg-black/50 dark:hover:text-white dark:hover:backdrop-blur-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto sm:justify-start hero-stack:w-auto hero-stack:flex-auto hero-stack:justify-center! hero-stack:whitespace-nowrap hero-stack:px-5 hero-tight:py-3 hero-short:py-2.5!"
            >
              Ver Productos
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5 motion-reduce:transition-none" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 hero-stack:bottom-5 hero-tight:bottom-3 hero-short:bottom-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-6 items-start justify-center rounded-full border border-foreground/30 p-1.5"
        >
          <motion.div className="h-2 w-1 rounded-full bg-foreground/60" />
        </motion.div>
      </motion.div>
      </div>
    </section>
  )
}
