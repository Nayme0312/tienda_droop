"use client"

import { useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Music, Facebook } from "lucide-react"
import { API_ROUTES, ApiError, api } from "@/lib/api/client"
import { NEWSLETTER_TURNSTILE_ACTION } from "@/lib/newsletter/constants"
import { Turnstile, type TurnstileHandle } from "@/components/turnstile"
import { LEGAL_PAGES, SIC_URL } from "@/lib/legal"

type NewsletterStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

/** Comprobacion rapida en el cliente; la validacion que cuenta es la del servidor. */
const EMAIL_HINT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function Footer() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<NewsletterStatus>({ kind: "idle" })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileFailed, setTurnstileFailed] = useState(false)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status.kind === "sending") return

    const trimmed = email.trim()
    if (!EMAIL_HINT.test(trimmed)) {
      setStatus({ kind: "error", message: "Introduce un correo valido." })
      return
    }
    if (!TURNSTILE_SITE_KEY) {
      setStatus({ kind: "error", message: "La suscripcion no esta disponible en este momento." })
      return
    }
    if (!turnstileToken) {
      setStatus({
        kind: "error",
        message: turnstileFailed
          ? "No se pudo cargar la verificacion anti-bots. Desactiva el bloqueador o recarga la pagina."
          : "Estamos verificando que no eres un bot. Intentalo en unos segundos.",
      })
      return
    }

    setStatus({ kind: "sending" })
    try {
      const { message } = await api.post<{ message: string }>(API_ROUTES.newsletter, {
        email: trimmed,
        turnstileToken,
        website: honeypotRef.current?.value ?? "",
      })
      setStatus({ kind: "success", message })
      setEmail("")
    } catch (error) {
      const message =
        error instanceof ApiError
          ? (error.fieldErrors?.email ?? error.message)
          : "No se ha podido completar la suscripcion."
      setStatus({ kind: "error", message })
    } finally {
      // El token ya se gasto (sirve una sola vez): se pide otro para el siguiente envio.
      turnstileRef.current?.reset()
    }
  }

  return (
    <footer className="border-t border-border/50 bg-card/30">
      {/* Newsletter */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl text-center"
        >
          <h3 className="mb-2 text-xl font-bold uppercase tracking-wider text-foreground">
            Unete al Movimiento
          </h3>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Recibe ofertas exclusivas, lanzamientos y contenido unico directo en tu correo.
          </p>
          <form onSubmit={handleSubscribe} noValidate className="relative flex flex-col gap-2 sm:flex-row">
            {/* Honeypot: invisible para personas y lectores de pantalla; los bots lo rellenan. */}
            <input
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              aria-label="Correo electronico"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (status.kind === "error") setStatus({ kind: "idle" })
              }}
              aria-invalid={status.kind === "error"}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50 transition-colors"
            />
            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wider text-background shadow-lg shadow-black/10 transition-[translate,scale,opacity,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
            >
              {status.kind === "sending" ? "Enviando..." : "Suscribir"}
            </button>
          </form>
          {TURNSTILE_SITE_KEY ? (
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              action={NEWSLETTER_TURNSTILE_ACTION}
              onToken={(token) => {
                setTurnstileToken(token)
                if (token) setTurnstileFailed(false)
              }}
              onError={() => setTurnstileFailed(true)}
              className="mt-3 flex justify-center empty:mt-0"
            />
          ) : null}
          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-sm ${
              status.kind === "error" ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {status.kind === "success" || status.kind === "error" ? status.message : ""}
          </p>
          {/* Aviso de Habeas Data: la suscripcion es la autorizacion (Ley 1581 de 2012) */}
          <p className="text-xs text-muted-foreground/80">
            Al suscribirte autorizas el tratamiento de tu correo según nuestra{" "}
            <Link href="/politica-de-privacidad" className="underline underline-offset-4 hover:text-foreground">
              Política de privacidad
            </Link>
            .
          </p>
        </motion.div>
      </div>

      {/* Legal */}
      <nav aria-label="Información legal" className="border-t border-border/50">
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-5 md:px-6">
          {LEGAL_PAGES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                {page.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={SIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              SIC
            </a>
          </li>
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-6">
          <Link href="/" className="text-base font-bold tracking-widest text-foreground uppercase border border-foreground/30 px-3 py-1.5 transition-colors duration-500 ease-out hover:border-foreground hover:bg-foreground hover:text-background">
            STREETVIBE
          </Link>

          <p className="text-xs text-muted-foreground">
            {"2024 STREETVIBE. Todos los derechos reservados."}
          </p>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="TikTok"
            >
              <Music className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 text-foreground/50 transition-[color,translate,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-foreground sm:p-0"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
