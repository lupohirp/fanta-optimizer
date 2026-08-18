import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FantaOptimizer Pro - Generatore & Ottimizzatore Rose Fantacalcio',
  description: 'Ottimizza la tua rosa del Fantacalcio dato il budget in crediti. Algoritmi intelligenti per asta, stima prezzi, rigoristi, statistiche avanzate e assistente live.',
  keywords: ['fantacalcio', 'asta fantacalcio', 'ottimizzatore rosa', 'suggeritore crediti', 'serie a', 'fantacalcio assistente'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
