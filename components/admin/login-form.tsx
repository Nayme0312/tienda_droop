'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoaderCircle, LogIn, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, API_ROUTES, api } from '@/lib/api/client'
import { ADMIN_BASE_PATH } from '@/lib/admin/routes'

/**
 * Formulario de inicio de sesion.
 *
 * No guarda ni manipula ningun token: el servidor responde poniendo una cookie
 * httpOnly que el navegador envia sola. El frontend no tiene acceso a ella, y
 * por tanto no hay ningun secreto en el cliente.
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Destino tras el login. Solo se acepta una ruta interna del panel: asi un
   * enlace manipulado con ?next=https://otro-sitio no puede usarse para
   * redirigir al administrador fuera de la aplicacion.
   */
  const safeNext = (): string => {
    const next = searchParams.get('next')
    if (next && next.startsWith(`${ADMIN_BASE_PATH}`) && !next.startsWith('//')) {
      return next
    }
    return ADMIN_BASE_PATH
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Introduce tu correo y tu contrasena.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post(API_ROUTES.login, { email: email.trim(), password })
      // `refresh` obliga a revalidar el layout del servidor, que ya vera sesion.
      router.replace(safeNext())
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('No se pudo iniciar sesion.')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-border bg-card/60 p-5 sm:p-6"
    >
      <div>
        <h1 className="text-base font-semibold text-foreground">
          Iniciar sesion
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Accede con tu cuenta de administrador.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@ejemplo.com"
          disabled={isSubmitting}
          className="bg-background/60"
        />
      </div>

      <div>
        <Label htmlFor="password" className="mb-2">
          Contrasena
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          disabled={isSubmitting}
          className="bg-background/60"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        Iniciar sesion
      </Button>
    </form>
  )
}
