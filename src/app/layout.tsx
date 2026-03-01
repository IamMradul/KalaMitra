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
