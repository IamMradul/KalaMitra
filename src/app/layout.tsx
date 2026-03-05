import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import Navbar from '@/components/Navbar'

import Footer from '@/components/Footer'
import AIChatConditional from '@/components/AIChatConditional'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KalaMitra',
  description: 'Empowering Indian Artisans with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>KalaMitra | Empowering Indian Artisans with AI</title>
        <meta name="description" content="KalaMitra: Empowering Indian Artisans with AI. Discover, shop, and support authentic Indian art and craft. Join the KalaMitra community!" />
        <meta name="keywords" content="KalaMitra, Indian Artisans, AI, Handicrafts, Marketplace, Indian Art, Buy Art, Support Artisans, kalamitra.store, Culture, Heritage,3D Bazaar" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="KalaMitra | Empowering Indian Artisans with AI" />
        <meta property="og:description" content="KalaMitra: Empowering Indian Artisans with AI. Discover, shop, and support authentic Indian art and craft." />
        <meta property="og:url" content="https://kalamitra.store" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://kalamitra.store/kalamitra-logo.png" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="KalaMitra" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="KalaMitra | Empowering Indian Artisans with AI" />
        <meta name="twitter:description" content="KalaMitra: Empowering Indian Artisans with AI. Discover, shop, and support authentic Indian art and craft." />
        <meta name="twitter:image" content="https://kalamitra.store/kalamitra-logo.png" />
        <meta name="author" content="Apoorv" />
        <meta property="profile:username" content="-apoorv-" />
        <meta property="profile:profile_link" content="https://www.linkedin.com/in/-apoorv-/" />
        <link rel="canonical" href="https://kalamitra.store" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <Navbar />
              <main className="min-h-screen bg-[var(--bg-1)]">
                {children}
              </main>
              <Footer />
              <AIChatConditional />
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
