"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Share, SquarePlus, X } from "lucide-react"
import { ADMIN_BASE_PATH } from "@/lib/admin/routes"
import { EASE_OUT } from "@/lib/motion"

/** Tiempo de navegacion (con la pestana visible) antes de ofrecer la instalacion. */
const SHOW_AFTER_SECONDS = 60
/** Segundos acumulados en esta sesion: sobreviven a recargas y cambios de pagina. */
const ELAPSED_KEY = "streetvibe:pwa-elapsed"
/** Si el usuario dice "Ahora no", no se vuelve a ofrecer en estos dias. */
const DISMISSED_KEY = "streetvibe:pwa-dismissed-at"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
/** Rutas donde no se interrumpe (se muestra en cuanto el usuario salga). */
const HIDDEN_PREFIXES = [ADMIN_BASE_PATH, "/checkout"]

/** Evento no estandar de Chrome/Edge/Samsung Internet; no viene en lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS no tiene `beforeinstallprompt`: solo se puede instalar desde Compartir. */
function isIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS se presenta como Mac; se distingue por la pantalla tactil.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

function readNumber(storage: Storage, key: string): number {
  try {
    const value = Number(storage.getItem(key))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function recentlyDismissed(): boolean {
  const at = readNumber(localStorage, DISMISSED_KEY)
  return at > 0 && Date.now() - at < SNOOZE_MS
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // Sin almacenamiento solo dura esta visita.
  }
}

/**
 * Registra el service worker y, tras SHOW_AFTER_SECONDS navegando, ofrece
 * agregar la tienda a la pantalla de inicio.
 *
 * - Chrome / Edge / Samsung (Android y escritorio): el boton "Agregar" abre el
 *   dialogo nativo de instalacion (`beforeinstallprompt`).
 * - iOS / iPadOS: no existe ese dialogo; "Agregar" muestra los dos pasos
 *   (Compartir -> Agregar a inicio).
 * - Navegadores sin ninguna de las dos opciones (p. ej. Firefox escritorio):
 *   no se muestra nada.
 *
 * Solo cuenta el tiempo con la pestana visible, no aparece si la tienda ya
 * esta instalada, ni en el panel ni durante el pago. Queda sobre el boton de
 * WhatsApp (z-[55]) y bajo modales y carrito (z-[60]+).
 */
export function PwaInstallPrompt() {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  /** "native" = hay dialogo del navegador; "ios" = instrucciones manuales. */
  const [mode, setMode] = useState<"native" | "ios" | null>(null)
  const [timeReached, setTimeReached] = useState(false)
  const [closed, setClosed] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  // Service worker: necesario para instalar en algunos navegadores y da la
  // pagina sin conexion.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin SW la tienda funciona igual; solo se pierde la pagina offline.
    })
  }, [])

  // Detectar si se puede ofrecer la instalacion y de que forma.
  useEffect(() => {
    if (isStandalone()) return

    const onBeforeInstall = (event: Event) => {
      // Evita la mini barra automatica de Chrome: lo ofrecemos nosotros.
      event.preventDefault()
      deferredPrompt.current = event as BeforeInstallPromptEvent
      setMode("native")
    }
    const onInstalled = () => {
      deferredPrompt.current = null
      setMode(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    if (isIOS()) setMode("ios")

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // Cronometro de navegacion: segundos con la pestana visible, acumulados en
  // la sesion para que recargar o cambiar de pagina no lo reinicie.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    let elapsed = readNumber(sessionStorage, ELAPSED_KEY)
    if (elapsed >= SHOW_AFTER_SECONDS) {
      setTimeReached(true)
      return
    }

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      elapsed += 1
      try {
        sessionStorage.setItem(ELAPSED_KEY, String(elapsed))
      } catch {}
      if (elapsed >= SHOW_AFTER_SECONDS) {
        setTimeReached(true)
        window.clearInterval(tick)
      }
    }, 1000)
    return () => window.clearInterval(tick)
  }, [])

  const hiddenHere = HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  const visible = timeReached && mode !== null && !closed && !hiddenHere

  const dismiss = () => {
    rememberDismissal()
    setClosed(true)
  }

  // Escape cierra, como cualquier ventana flotante.
  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible])

  const handleAdd = async () => {
    if (mode === "ios") {
      setShowIOSSteps(true)
      return
    }

    const promptEvent = deferredPrompt.current
    if (!promptEvent) return
    // El evento solo se puede usar una vez, acepte o no.
    deferredPrompt.current = null
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === "dismissed") rememberDismissal()
    setClosed(true)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-install"
          role="dialog"
          aria-modal="false"
          aria-labelledby="pwa-install-title"
          aria-describedby="pwa-install-text"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="fixed inset-x-3 z-[58] mx-auto max-w-sm rounded-2xl border border-border bg-card/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:left-4"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-xl ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <p id="pwa-install-title" className="text-sm font-semibold text-foreground">
                Lleva STREETVIBE contigo
              </p>
              <p id="pwa-install-text" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                ¿Quieres agregar esta tienda a tu pantalla de inicio para un acceso más rápido?
              </p>
            </div>
          </div>

          {showIOSSteps ? (
            <ol className="mt-4 space-y-2 rounded-xl bg-foreground/5 p-3 text-xs text-foreground">
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  1
                </span>
                Toca <Share aria-label="Compartir" className="size-4 shrink-0" /> en la barra del navegador.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  2
                </span>
                Elige <SquarePlus aria-hidden className="size-4 shrink-0" /> <strong>Agregar a inicio</strong>.
              </li>
            </ol>
          ) : (
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Agregar
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
