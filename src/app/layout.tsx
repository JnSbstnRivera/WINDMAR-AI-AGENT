import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// viewport-fit=cover habilita el uso de env(safe-area-inset-*) en CSS
// para que el contenido respete el notch del iPhone y la home indicator.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Mantener el theme color brand (azul Windmar) en la barra del navegador
  themeColor: '#1B3A5C',
};

const SITE_URL = 'https://windmar-ai-agent.vercel.app';
const TITLE = 'Agente Windmar Home AI';
const DESCRIPTION = 'Copiloto IA del Call Center de Windmar Home Puerto Rico — 22 años iluminando hogares ☀️';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Favicon: Next.js auto-detecta src/app/icon.png y genera <link rel="icon">.
  // No declaramos icons aquí para evitar conflictos.
  // Preview en Teams, WhatsApp, Slack, LinkedIn, Discord, etc.
  openGraph: {
    type: 'website',
    locale: 'es_PR',
    url: SITE_URL,
    siteName: 'Windmar Home AI',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/sunbot-feliz.png',
        width: 512,
        height: 512,
        alt: 'SUN BOT — Agente Windmar Home AI',
      },
    ],
  },
  // Preview específico para Twitter/X (también lo lee LinkedIn)
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/sunbot-feliz.png'],
  },
};

// Script inline que corre ANTES de la hidratación para evitar flash claro→oscuro.
// Default = dark. Si el usuario eligió 'light' previamente, lo respeta.
const noFlashScript = `
(function() {
  try {
    var saved = localStorage.getItem('wh-theme');
    var dark = saved === null ? true : saved === 'dark';
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
