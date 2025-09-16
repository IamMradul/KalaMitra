"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type Theme = 'light' | 'dark'

const ThemeContext = createContext({
  theme: 'light' as Theme,
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = typeof window !== 'undefined' && localStorage.getItem('theme')
      return (saved as Theme) || 'light'
    } catch {
      return 'light'
    }
  })

  // read auth context to persist theme when available
  const auth = useAuth()

  // If the logged-in user's profile contains a preferred_theme, apply it on mount.
  // Helper to safely read preferred_theme from profile without using `any`
  const getPreferredTheme = (profile: unknown): Theme | undefined => {
    if (!profile || typeof profile !== 'object') return undefined
    const p = profile as Record<string, unknown>
    const candidate = p['preferred_theme']
    if (candidate === 'light' || candidate === 'dark') return candidate
    return undefined
  }

  useEffect(() => {
    const pref = getPreferredTheme(auth?.profile)
    if (pref) setTheme(pref)
  }, [JSON.stringify(auth?.profile)])

  useEffect(() => {
    // apply theme attribute
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
    // add temporary transition class for smooth theme change
    document.documentElement.classList.add('theme-transition')
    const id = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 320)
    // persist preference to Supabase when a logged-in user is present
    const persist = async () => {
      try {
        // useAuth is client-only; fetch user/profile from context
        if (auth?.user?.id) {
          await supabase.from('profiles').update({ preferred_theme: theme }).eq('id', auth.user.id)
        }
      } catch {
        // ignore persistence errors (DB column might not exist yet)
      }
    }
    void persist()

    return () => window.clearTimeout(id)
  }, [theme, auth?.user?.id])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
