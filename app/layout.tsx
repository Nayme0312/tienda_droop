import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { SeasonProvider } from "@/components/seasonal/season-provider"
import { SeasonalEffects } from "@/components/seasonal/seasonal-effects"
import { StoreBackground } from "@/components/store-background"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { loadActiveSeason } from "@/lib/seasons/active-season"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "STREETVIBE | Estilo Que Te Define",
  description:
    "Tienda de ropa streetwear premium. Camisas y gorras con disenos unicos para todos los estilos.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS: nombre y barra de estado cuando se abre desde la pantalla de inicio
  // (el resto de la PWA esta en app/manifest.ts).
  appleWebApp: {
    capable: true,
    title: "STREETVIBE",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fecha especial activa desde el panel (Navidad...). null = diseno normal.
  const season = await loadActiveSeason()

  return (
    <html lang="es" className="bg-background dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/* Fondo animado de la tienda publica (no en el panel ni en el Hero) */}
          <StoreBackground />
          <SeasonProvider season={season}>
            {children}
            <SeasonalEffects />
          </SeasonProvider>
          {/* Contacto por WhatsApp en toda la tienda (no en el panel) */}
          <WhatsAppButton />
          {/* Invitacion a instalar la tienda tras 1 min navegando */}
          <PwaInstallPrompt />
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
