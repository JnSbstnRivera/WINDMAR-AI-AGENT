import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agente Windmar Home AI',
  description: 'Copiloto IA del Call Center de Windmar Home Puerto Rico',
  icons: {
    icon: '/favicon.svg',
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
      <body>{children}</body>
    </html>
  );
}
