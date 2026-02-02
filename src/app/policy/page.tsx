'use client';
import { useTranslation } from 'react-i18next';

export default function PolicyPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('legal.privacyPolicy.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('legal.privacyPolicy.intro')}
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-[var(--bg-1)]/50 border border-[var(--heritage-gold)]/30 rounded-full text-sm text-[var(--heritage-brown)] font-medium">
            {t('legal.privacyPolicy.lastUpdated')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-10">

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              {t('legal.privacyPolicy.section1Title')}
            </h2>
            <div className="prose text-[var(--muted)] max-w-none space-y-4 leading-relaxed">
              {(t('legal.privacyPolicy.section1Desc').split('\n\n')).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <p className="bg-[var(--bg-1)] p-4 rounded-xl border border-[var(--heritage-gold)]/20 inline-block">
                For any privacy-related queries, contact: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] font-bold hover:underline">talkto.kalamitra@gmail.com</a>
              </p>
            </div>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              {t('legal.privacyPolicy.section2Title')}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              {t('legal.privacyPolicy.section2Desc')}
            </p>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              {t('legal.privacyPolicy.section3Title')}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              {t('legal.privacyPolicy.section3Desc')}
            </p>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              {t('legal.privacyPolicy.section4Title')}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              {t('legal.privacyPolicy.section4Desc')}
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
