"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Campo de la lupa de la barra superior (Navbar y StoreFloatingNavbar). Al
 * pulsar Enter lleva a /buscar?q=..., que busca en todo el catalogo con las
 * reglas de lib/search.ts. `onSearched` cierra la barra de busqueda.
 */
export function NavbarSearch({ onSearched }: { onSearched: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    router.push(`/buscar?q=${encodeURIComponent(term)}`)
    setQuery("")
    onSearched()
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        enterKeyHint="search"
        aria-label="Buscar productos"
        placeholder="Buscar productos..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={120}
        className="w-full bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
        autoFocus
      />
    </form>
  )
}
