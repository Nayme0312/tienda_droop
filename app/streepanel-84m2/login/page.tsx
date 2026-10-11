import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from '@/components/admin/login-form'

export const metadata: Metadata = {
  title: 'Iniciar sesion | STREETVIBE',
  robots: { index: false, follow: false },
}

/**
 * Login del panel. Vive fuera del grupo (panel), asi que no monta el sidebar ni
 * el proveedor de productos: es una pantalla independiente a pantalla completa.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-black uppercase leading-none tracking-[0.2em] text-foreground">
            Streetvibe
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Panel administrativo
          </p>
        </div>

        {/* LoginForm lee ?next= con useSearchParams, que exige un limite de
            Suspense para poder prerenderizar la pagina. */}
        <Suspense
          fallback={
            <div className="h-72 animate-pulse rounded-xl border border-border bg-card/40" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Acceso restringido. Si no tienes credenciales, no continues.
        </p>
      </div>
    </div>
  )
}
