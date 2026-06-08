import type { MetadataRoute } from 'next';

// Web App Manifest — convierte el Agente Windmar en una PWA instalable.
// Next.js sirve esto en /manifest.webmanifest y lo enlaza automáticamente.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agente Windmar Home AI',
    short_name: 'SUN BOT',
    description:
      'Copiloto IA del Call Center de Windmar Home Puerto Rico — 22 años iluminando hogares ☀️',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f1115',
    theme_color: '#1B3A5C',
    lang: 'es-PR',
    categories: ['business', 'productivity', 'utilities'],
    // Iconos PNG con fondo transparente (sin recuadro azul).
    // No declaramos 'maskable' a propósito: ese formato exige fondo sólido
    // edge-to-edge, lo que reintroduciría el recuadro que no queremos.
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
