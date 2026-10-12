import type { MetadataRoute } from "next"

/**
 * Manifiesto de la PWA (Next lo sirve en /manifest.webmanifest y anade el
 * <link rel="manifest"> automaticamente).
 *
 * Es lo que permite "Agregar a la pantalla de inicio": nombre, iconos y que
 * la tienda se abra a pantalla completa, sin la barra del navegador.
 * Los iconos se generan en public/icons/.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "STREETVIBE | Estilo Que Te Define",
    short_name: "STREETVIBE",
    description:
      "Tienda de ropa streetwear premium. Camisas y gorras con disenos unicos para todos los estilos.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
