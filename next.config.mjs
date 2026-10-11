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
}

export default nextConfig
