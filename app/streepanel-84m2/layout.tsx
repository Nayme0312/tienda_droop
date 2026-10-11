import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

/**
 * Layout raiz del area administrativa.
 *
 * Deliberadamente minimo: solo metadatos y los avisos. El shell con sidebar y
 * cabecera vive en el layout del grupo (panel), para que la pagina de login no
 * lo herede y no monte el proveedor de productos (que exige sesion).
 *
 * El grupo (panel) no aparece en las URLs: /streepanel-84m2 y sus subrutas
 * siguen respondiendo exactamente igual que en la etapa 1.
 */
export const metadata: Metadata = {
  title: 'Panel administrativo | STREETVIBE',
  description: 'Gestion de productos de la tienda STREETVIBE.',
  // El panel no debe aparecer en buscadores. La proteccion real es la
  // autenticacion; esto solo evita que la ruta se indexe.
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  )
}
