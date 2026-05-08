import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

const SITE_URL = 'https://windmar-ai-agent.vercel.app';
const TITLE = 'Agente Windmar Home AI';
const DESCRIPTION = 'Copiloto IA del Call Center de Windmar Home Puerto Rico — 22 años iluminando hogares ☀️';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Favicon en la pestaña del navegador
  icons: {
    icon: [
      { url: '/sunbot-feliz.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/sunbot-feliz.png',
    apple: '/sunbot-feliz.png',
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
