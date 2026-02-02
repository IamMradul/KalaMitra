'use client';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/components/LanguageProvider';

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--heritage-red)]/5 rounded-full blur-3xl -ml-32 -mt-32"></div>
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('contact.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('contact.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 relative overflow-hidden">

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-6 border-b border-[var(--heritage-gold)]/20 pb-2">{t('contact.getInTouch')}</h2>
                <ul className="space-y-6 text-[var(--muted)]">
                  <li className="flex items-center gap-4 group">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] flex items-center justify-center text-white shadow-glow group-hover:scale-110 transition-transform">✉️</span>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-[var(--heritage-brown)]">{t('contact.emailLabel')}</p>
                      <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--text)] font-medium hover:text-[var(--heritage-red)] transition-colors text-lg">talkto.kalamitra@gmail.com</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-4 group">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] flex items-center justify-center text-white shadow-glow group-hover:scale-110 transition-transform">✉️</span>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-[var(--heritage-brown)]">{t('contact.secondaryEmailLabel')}</p>
                      <a href="mailto:thinktech17@gmail.com" className="text-[var(--text)] font-medium hover:text-[var(--heritage-blue)] transition-colors text-lg">thinktech17@gmail.com</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-4 group">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] flex items-center justify-center text-white shadow-glow group-hover:scale-110 transition-transform">📞</span>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-[var(--heritage-brown)]">{t('contact.phoneLabel')}</p>
                      <a href="tel:+919616928911" className="text-[var(--text)] font-medium hover:text-[var(--heritage-red)] transition-colors text-lg">+91 9616928911</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-4 group">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--heritage-brown)] to-[var(--heritage-gold)] flex items-center justify-center text-white shadow-glow group-hover:scale-110 transition-transform">📞</span>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-[var(--heritage-brown)]">{t('contact.phoneLabel')}</p>
                      <a href="tel:+919305343135" className="text-[var(--text)] font-medium hover:text-[var(--heritage-gold)] transition-colors text-lg">+91 9305343135</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[var(--bg-1)] to-[var(--bg-2)] p-8 rounded-2xl border border-[var(--heritage-gold)]/30 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--heritage-gold)]/10 rounded-full blur-xl"></div>
              <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-4">{t('contact.mailingAddressTitle')}</h2>
              <div className="text-[var(--muted)] leading-relaxed space-y-2 text-lg">
                <p className="font-bold text-[var(--heritage-brown)] text-xl mb-2">{t('contact.mailingAddressPoints.0')}</p>
                <p>{t('contact.mailingAddressPoints.1')}</p>
                <p>{t('contact.mailingAddressPoints.2')}</p>
                <p>{t('contact.mailingAddressPoints.3')}</p>
                <p>{t('contact.mailingAddressPoints.4')}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-[var(--heritage-gold)]/20">
                <p className="text-sm text-[var(--muted)]"><span className="font-semibold text-[var(--heritage-brown)]">{t('contact.foundersLabel')}:</span> {t('contact.foundersName')}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
