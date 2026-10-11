import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { CategoriesProvider } from '@/components/admin/categories-provider'
import { ProductsProvider } from '@/components/admin/products-provider'
import { PromotionsProvider } from '@/components/admin/promotions-provider'
import { getSession } from '@/lib/auth/session'
import { adminRoutes } from '@/lib/admin/routes'

/**
 * Layout de las paginas autenticadas del panel.
 *
 * Segunda comprobacion de sesion, en el servidor: el middleware ya redirige a
 * quien no tiene cookie valida, pero esta comprobacion garantiza que ninguna
 * pagina del panel llegue a renderizarse sin sesion aunque el middleware no se
 * ejecutara. La tercera comprobacion esta en cada route handler de la API.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect(adminRoutes.login)

  return (
    // Las categorias van por fuera: el menu lateral y el formulario de
    // producto las necesitan.
    <CategoriesProvider>
    <ProductsProvider>
      {/* PromotionsProvider va dentro para que el formulario de promocion pueda
          leer los productos ya cargados y ofrecer el selector. */}
      <PromotionsProvider>
        <AdminShell adminName={session.name} adminEmail={session.email}>
          {children}
        </AdminShell>
      </PromotionsProvider>
    </ProductsProvider>
    </CategoriesProvider>
  )
}
