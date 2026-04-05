import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: "Appels d'offre Guyane",
  description: 'Veille des marchés publics en Guyane',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="tailwind-config" strategy="beforeInteractive">{`
          tailwind.config = {
            theme: {
              extend: {}
            }
          }
        `}</Script>
      </head>
      <body className="min-h-screen font-sans" style={{ display: 'flex' }} suppressHydrationWarning>
        <Navbar />
        <main className="main-content" style={{
          marginLeft: '220px',
          flex: 1,
          minHeight: '100vh',
          padding: '32px 32px',
          maxWidth: 'calc(100vw - 220px)',
        }}>
          {children}
        </main>
        <style>{`
          @media (max-width: 768px) {
            .main-content {
              margin-left: 0 !important;
              max-width: 100vw !important;
              padding: 80px 16px 24px !important;
            }
          }
        `}</style>
      </body>
    </html>
  )
}
