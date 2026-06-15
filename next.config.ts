import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // SHA del commit desplegado, horneado en el bundle del cliente. Se compara
  // contra /api/version (que devuelve el SHA del deploy vivo) para auto-actualizar
  // el PWA cuando hay una versión nueva (sin limpiar caché a mano).
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
};

export default nextConfig;
