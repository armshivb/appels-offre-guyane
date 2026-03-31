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
      <body className="bg-gray-50 min-h-screen font-sans">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
