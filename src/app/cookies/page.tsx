'use client';
import { useTranslation } from 'react-i18next';

export default function CookiesPolicyPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('legal.cookiePolicy.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('legal.cookiePolicy.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-6">

          <div className="prose prose-lg text-[var(--muted)] leading-relaxed max-w-none">
            <p>{t('legal.cookiePolicy.desc1')}</p>
            <p>{t('legal.cookiePolicy.desc2')}</p>
            <p>{t('legal.cookiePolicy.desc3')}</p>
          </div>

          <div className="bg-[var(--bg-1)] p-6 rounded-2xl mt-8 border border-[var(--heritage-gold)]/10">
            <h3 className="text-lg font-bold text-[var(--heritage-brown)] mb-2">{t('legal.cookiePolicy.questionsTitle')}</h3>
            <p className="text-[var(--muted)]">
              {t('legal.cookiePolicy.contactText')} <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] font-medium hover:underline">talkto.kalamitra@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
