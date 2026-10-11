"use client"

import { cn } from "@/lib/utils"

/**
 * Piezas decorativas de la temporada de Navidad. Todas son `aria-hidden` y
 * `pointer-events-none`: decoran sin interferir con clics ni lectores de
 * pantalla.
 */

/** Gorro de Navidad que se apoya en la esquina de una tarjeta de producto. */
export function SantaHat({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 52"
      aria-hidden
      className={cn("pointer-events-none drop-shadow-md", className)}
    >
      {/* Cuerpo rojo con la punta caida hacia fuera */}
      <path
        d="M9 40C11 23 23 9 39 8c11-1 18 6 19 17-4-3-9-3-12 1-2 5 1 10 6 14H9Z"
        fill="#c8102e"
      />
      {/* Sombra lateral para dar volumen */}
      <path
        d="M39 8c11-1 18 6 19 17-4-3-9-3-12 1-1-7-3-13-7-18Z"
        fill="#9b0c23"
      />
      {/* Borde de pelo */}
      <rect x="5" y="37" width="50" height="12" rx="6" fill="#f8fafc" />
      {/* Pompon */}
      <circle cx="57" cy="28" r="5.5" fill="#f8fafc" />
    </svg>
  )
}

const BULB_COLORS = ["#e11d48", "#16a34a", "#f59e0b", "#f8fafc"]
const BULB_COUNT = 28

/**
 * Guirnalda de luces bajo el navbar. En movil se muestra la mitad de las
 * bombillas para que no quede recargada.
 */
export function ChristmasLights() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-full h-4 overflow-hidden"
    >
      {/* Cable */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
      <div className="mx-auto flex max-w-7xl justify-around px-4 md:px-6">
        {Array.from({ length: BULB_COUNT }, (_, i) => (
          <span
            key={i}
            className={cn(
              "season-twinkle block h-2 w-1.5 rounded-b-full",
              i % 2 === 1 && "max-sm:hidden",
              // Altura alterna: el cable parece colgar entre bombillas
              i % 2 === 0 ? "mt-0.5" : "mt-1.5",
            )}
            style={{
              backgroundColor: BULB_COLORS[i % BULB_COLORS.length],
              boxShadow: `0 0 6px ${BULB_COLORS[i % BULB_COLORS.length]}`,
              animationDelay: `${(i % 7) * 0.45}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
