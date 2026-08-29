import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apartment Management System By Mino V1',
  description: 'Mobile-first apartment and rental room management system by Mino',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Apartment MS',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#4318ff' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lo">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
