/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // proxy.ts recibe todas las peticiones de /api/admin y, por defecto, corta
    // los cuerpos a 10 MB. Los videos de producto admiten hasta 50 MB
    // (MAX_VIDEO_BYTES en lib/storage/uploads.ts) mas el sobre multipart.
    proxyClientMaxBodySize: '55mb',
  },
  async headers() {
    return [
      {
        // El navegador debe revisar siempre si hay un service worker nuevo.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
}

export default nextConfig
