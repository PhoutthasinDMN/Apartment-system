import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ລະບົບຈັດການຫ້ອງເຊົ່າ',
  description: 'Professional apartment and rental room management system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lo">
      <body>{children}</body>
    </html>
  );
}
