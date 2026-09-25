// © ThinkTech — KalaMitra — 2026
"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import '@/lib/i18n'

const FooterItem = ({ text, link }: { text: string, link: string }) => {
  return (
    <li>
      <Link href={link} className="text-sm font-medium duration-200 hover:text-[var(--heritage-gold)] dark:hover:text-[var(--heritage-accent)] transition-colors text-[var(--muted)]">
        {text}
      </Link>
    </li>
  )
}

const FooterBlockItem = ({ title, items }: { title: string, items: Array<{ id: number; link: string; text: string }> }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold font-cormorant text-[var(--text)]">{title}</h3>
      <ul className="space-y-4">
        {
          items.map(item => (
            <FooterItem key={item.id} {...item} />
          ))
        }
      </ul>
    </div>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatches
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <footer className="bg-[var(--bg-1)] border-t border-[var(--border)] mt-auto">
        <div className="max-w-7xl mx-auto py-16" />
      </footer>
    )
  }

  const footerBlocks = [
    {
      id: 1,
      title: t('footer.quickLinks', 'Quick Links'),
      items: [
        { id: 1, text: t('footer.about', 'About Us'), link: "/about" },
        { id: 2, text: t('footer.howItWorks', 'How It Works'), link: "/howitworks" },
        { id: 3, text: t('footer.successStories', 'Success Stories'), link: "/successstories" },
        { id: 4, text: t('footer.support', 'Support'), link: "/support" }
      ]
    },
    {
      id: 2,
      title: t('footer.legal', 'Legal'),
      items: [
        { id: 1, text: t('footer.privacy', 'Privacy Policy'), link: "/policy" },
        { id: 2, text: t('footer.terms', 'Terms of Service'), link: "/terms" },
        { id: 3, text: t('footer.cookies', 'Cookie Policy'), link: "/cookies" },
        { id: 4, text: t('footer.contact', 'Contact'), link: "/contact" }
      ]
    },
  ]

  return (
    <footer className="bg-[var(--bg-1)] border-t border-[var(--border)] mt-auto text-[var(--text)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-12 lg:px-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 py-16">

        {/* Brand Section */}
        <div className="space-y-6 col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/kalamitra-symbol.png"
              alt="KalaMitra Symbol"
              width={80}
              height={80}
              className="object-contain"
              style={{ width: '80px', height: 'auto' }}
            />
            <span className="text-2xl font-bold font-cormorant">{t('brand.name', 'KalaMitra')}</span>
          </Link>
          <p className="text-sm font-medium text-[var(--muted)] leading-relaxed max-w-sm">
            {t('footer.tagline', 'Preserving Tradition, Empowering Artisans ✨')}
          </p>
        </div>

        {/* Dynamic Blocks */}
        {
          footerBlocks.map(footerBlock => (
            <FooterBlockItem key={footerBlock.id} {...footerBlock} />
          ))
        }

        {/* Newsletter Section */}
        <div className="space-y-6 col-span-1 md:col-span-2">
          <h3 className="text-lg font-bold font-cormorant text-[var(--text)]">{t('footer.subscribeTitle', 'Subscribe')}</h3>
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-sm">
            {t('footer.communityBlurb', 'Join our community of artisans and art lovers, preserving cultural heritage while embracing the future of digital commerce.')}
          </p>
          <form className="w-full max-w-md flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder={t('footer.emailPlaceholder', 'email@example.com')}
              className="px-4 py-2.5 rounded-lg outline-none flex-1 bg-[var(--bg-2)] border border-[var(--border)] focus:border-[var(--heritage-gold)] transition-colors text-sm"
            />
            <button className="outline-none w-full py-2.5 px-6 sm:w-max bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] hover:opacity-90 text-white rounded-lg flex items-center justify-center font-semibold text-sm transition-all shadow-sm">
              {t('footer.subscribeBtn', 'Subscribe')}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-12 lg:px-5">
        <div className="w-full flex flex-col md:flex-row gap-4 items-center sm:justify-between pt-6 pb-20 border-t border-[var(--border)] text-sm text-[var(--muted)] font-medium">
          <div className="flex text-center sm:text-left sm:min-w-max">
            <p> {t('footer.copyright', '© 2025 KalaMitra. All rights reserved.')} </p>
          </div>
          <div className="flex justify-center sm:justify-end w-full">
            <p className="mt-2 sm:mt-0 text-center sm:text-right">
              Built by <span className="font-semibold">ThinkTech</span>{' '}
              <Link href="/creators" className="ml-1 text-[var(--heritage-gold)] hover:underline">
                (See creators)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
