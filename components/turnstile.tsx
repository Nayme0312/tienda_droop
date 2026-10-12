"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

/**
 * Widget de Cloudflare Turnstile (anti-bots).
 *
 * Se renderiza con appearance "interaction-only": para la mayoria de personas
 * es invisible y solo aparece una casilla si Cloudflare necesita confirmar que
 * no es un bot. El token que entrega se envia al servidor, que es quien lo
 * valida de verdad (lib/security/turnstile.ts).
 *
 * El script se carga desde Cloudflare (obligatorio: no se puede alojar aqui) una
 * sola vez por pagina, aunque haya varios widgets.
 */
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

interface TurnstileRenderOptions {
  sitekey: string
  action?: string
  appearance?: "always" | "execute" | "interaction-only"
  theme?: "auto" | "light" | "dark"
  callback?: (token: string) => void
  "expired-callback"?: () => void
  "error-callback"?: () => void
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error("Turnstile no se inicializo"))
    }
    script.onerror = () => {
      // Permite reintentar en un montaje posterior.
      scriptPromise = null
      script.remove()
      reject(new Error("No se pudo cargar Turnstile"))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export interface TurnstileHandle {
  /** Pide un token nuevo (los tokens son de un solo uso). */
  reset(): void
}

interface TurnstileProps {
  siteKey: string
  action: string
  /** Recibe el token, o null cuando caduca o falla. */
  onToken(token: string | null): void
  /** No se pudo cargar o ejecutar el widget (bloqueador, sin red...). */
  onError?(): void
  className?: string
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { siteKey, action, onToken, onError, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // Los callbacks se leen desde refs para no volver a montar el widget en cada render.
  const onTokenRef = useRef(onToken)
  const onErrorRef = useRef(onError)
  onTokenRef.current = onToken
  onErrorRef.current = onError

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        onTokenRef.current(null)
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        const id = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          theme: "auto",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null)
            onErrorRef.current?.()
          },
        })
        widgetIdRef.current = id ?? null
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.()
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [siteKey, action])

  return <div ref={containerRef} className={className} />
})
