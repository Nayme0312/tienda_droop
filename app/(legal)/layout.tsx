import { loadVisibleSections } from "@/lib/api/public-products"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CartDrawer } from "@/components/cart-drawer"

// Igual que el resto de la tienda: el menu refleja al instante las secciones
// que se activan o desactivan desde el panel.
export const dynamic = "force-dynamic"

/**
 * Marco comun de las paginas legales (/terminos-y-condiciones,
 * /politica-de-privacidad, /politicas-de-envio-y-devoluciones): mismo menu,
 * footer y carrito que la tienda. El grupo (legal) no aparece en la URL.
 */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const sections = await loadVisibleSections()

  return (
    <>
      <Navbar sections={sections} />
      <main className="min-h-screen pt-28 pb-20">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
