/*
 * Service worker de la PWA.
 *
 * A proposito NO cachea la tienda: precios, stock, carrito y panel siempre
 * salen de la red. Solo guarda una pagina "sin conexion" para mostrarla
 * cuando una navegacion falla (y asi la app instalada no ensena el dinosaurio).
 *
 * Si se cambia offline.html, sube CACHE_NAME para que se actualice.
 */
const CACHE_NAME = "streetvibe-offline-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  // Solo navegaciones (paginas). Imagenes, API, etc. siguen su camino normal.
  if (event.request.mode !== "navigate") return

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME)
      return (await cache.match(OFFLINE_URL)) || Response.error()
    }),
  )
})
