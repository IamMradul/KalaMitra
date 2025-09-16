'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

interface LanguageContextType {
  currentLanguage: string
  changeLanguage: (lang: string) => void
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [currentLanguage, setCurrentLanguage] = useState('en')

  useEffect(() => {
    // Initialize language from various sources
    const initializeLanguage = async () => {
      try {
        // Wait for i18n to be ready
        if (!i18n.isInitialized) {
          await new Promise(resolve => {
            const checkReady = () => {
              if (i18n.isInitialized) {
                resolve(true)
              } else {
                setTimeout(checkReady, 100)
              }
            }
            checkReady()
          })
        }

        // Check for language in URL params first
        const urlParams = new URLSearchParams(window.location.search)
        const urlLang = urlParams.get('lang')
        
        // Check for language in localStorage
        const storedLang = localStorage.getItem('preferredLanguage')
        
        // Check for language in cookies
        const cookieMatch = document.cookie.match(/(?:^|; )preferredLanguage=([^;]+)/)
        const cookieLang = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
        
        // Determine the language to use
        const targetLang = urlLang || cookieLang || storedLang || 'en'
        
        // Only change language if it's different from current
        if (i18n.language !== targetLang) {
          await i18n.changeLanguage(targetLang)
        }
        
        setCurrentLanguage(targetLang)
        
        // Update cookie to persist language choice
        document.cookie = `preferredLanguage=${targetLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        
        // Update localStorage
        localStorage.setItem('preferredLanguage', targetLang)
        
      } catch (error) {
        console.error('Error initializing language:', error)
        setCurrentLanguage('en')
      } finally {
        setIsLoading(false)
      }
    }

    initializeLanguage()
  }, [i18n])

  const changeLanguage = async (lang: string) => {
    try {
      setIsLoading(true)
      
      // Change language in i18next
      await i18n.changeLanguage(lang)
      
      // Update state
      setCurrentLanguage(lang)
      
      // Persist to localStorage
      localStorage.setItem('preferredLanguage', lang)
      
      // Persist to cookie
      document.cookie = `preferredLanguage=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      
      // Update URL without page reload
      const url = new URL(window.location.href)
      url.searchParams.set('lang', lang)
      window.history.replaceState({}, '', url.toString())
      
      // Force a re-render of components that depend on language
      router.refresh()
      
    } catch (error) {
      console.error('Error changing language:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
