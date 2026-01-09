"use client"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import '@/lib/i18n'

export default function Footer() {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatches by rendering a stable placeholder until mounted
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <footer className="heritage-card border-t border-heritage-gold/40 mt-auto heritage-bg">
        <div className="container-custom py-16" />
      </footer>
    )
  }
  return (
    <footer className="heritage-card border-t border-heritage-gold/40 mt-auto heritage-bg">
      <div className="container-custom py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-2xl flex items-center justify-center shadow-medium hover:shadow-glow transition-all duration-300 hover:scale-110 border-2 border-heritage-gold">
                <span className="text-white font-bold text-lg">KM</span>
              </div>
              <span className="text-3xl font-bold heritage-title" key={`footer-brand-${currentLanguage}`}>
                {t('brand.name')}
              </span>
            </div>
            <p className="text-[var(--muted)] text-lg mb-6 max-w-md leading-relaxed">
              {t('footer.tagline')}
            </p>
            <p className="text-[var(--muted)] text-sm leading-relaxed">
              {t('footer.communityBlurb')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
  <h3 className="text-lg font-semibold text-[var(--text)] mb-6">{t('footer.quickLinks')}</h3>
            <div className="space-y-4">
                <a href="/about" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
              <span className="group-hover:underline">{t('footer.about')}</span>
                </a>
                <a href="/howitworks" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
              <span className="group-hover:underline">{t('footer.howItWorks')}</span>
                </a>
                <a href="/successstories" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
              <span className="group-hover:underline">{t('footer.successStories')}</span>
                </a>
                <a href="/support" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
              <span className="group-hover:underline">{t('footer.support')}</span>
                </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-6">{t('footer.legal')}</h3>
            <div className="space-y-4">
              <a href="/policy" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
                <span className="group-hover:underline">{t('footer.privacy')}</span>
              </a>
              <a href="/terms" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
                <span className="group-hover:underline">{t('footer.terms')}</span>
              </a>
              <a href="/cookies" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
                <span className="group-hover:underline">{t('footer.cookies')}</span>
              </a>
              <a href="/contact" className="block text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:translate-x-2 transform group">
                <span className="group-hover:underline">{t('footer.contact')}</span>
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-[var(--border)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[var(--muted)] text-sm">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center space-x-8 mt-6 md:mt-0">
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/thinktech17" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:scale-110 transform group" aria-label="LinkedIn">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm15.5 10.28h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.39v4.58h-3v-9h2.89v1.23h.04c.4-.75 1.37-1.54 2.82-1.54 3.01 0 3.57 1.98 3.57 4.56v4.75z"/>
              </svg>
            </a>
            {/* GitHub */}
            <a href="https://github.com/iapoorv01/" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:scale-110 transform group" aria-label="GitHub">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/i__apoorv__01/" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-heritage-gold transition-all duration-300 hover:scale-110 transform group" aria-label="Instagram">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.775.131 4.602.425 3.635 1.392 2.668 2.359 2.374 3.532 2.315 4.808 2.256 6.088 2.243 6.497 2.243 12c0 5.503.013 5.912.072 7.192.059 1.276.353 2.449 1.32 3.416.967.967 2.14 1.261 3.416 1.32 1.28.059 1.689.072 7.192.072s5.912-.013 7.192-.072c1.276-.059 2.449-.353 3.416-1.32.967-.967 1.261-2.14 1.32-3.416.059-1.28.072-1.689.072-7.192s-.013-5.912-.072-7.192c-.059-1.276-.353-2.449-1.32-3.416C19.449.425 18.276.131 17 .072 15.72.013 15.311 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
