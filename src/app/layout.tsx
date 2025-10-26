import type { Metadata } from "next";
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/components/LanguageProvider";
import ThemeProvider from '@/components/ThemeProvider'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatConditional from '@/components/AIChatConditional';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KalaMitra - AI Marketplace Assistant for Artisans",
  description: "Preserving Tradition, Empowering Artisans",
};

// Note: Do not export generateMetadata alongside metadata to avoid Next.js build errors.

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read preferred language from cookies to keep SSR and client in sync
  const cookieStore = await cookies()
  const preferredLang = cookieStore.get('preferredLanguage')?.value || 'en'
  // Add client-side path check for conditional rendering
  // Use a wrapper component for conditional AIShoppingChat
  return (
    <html lang={preferredLang}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen heritage-bg`}
      >
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <AIChatConditional />
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

