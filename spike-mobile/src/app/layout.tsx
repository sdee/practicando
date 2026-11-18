import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Practicando — Spike',
  applicationName: 'Practicando',
  // iOS ignores the manifest icons — set the apple icon explicitly.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Practicando',
  },
  icons: { apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#312e81',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Draw under the notch / home indicator; pad with env(safe-area-inset-*).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
