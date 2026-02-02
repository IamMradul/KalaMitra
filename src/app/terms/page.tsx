'use client';
import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('legal.termsOfService.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('legal.termsOfService.intro')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-10">

          <div className="bg-[var(--bg-1)] p-6 rounded-2xl text-[var(--muted)] text-sm mb-8 border border-[var(--heritage-gold)]/20 shadow-inner">
            <p className="font-bold text-[var(--heritage-brown)] mb-2 text-lg">{t('legal.termsOfService.operatedBy')}</p>
            <p className="leading-relaxed">{t('legal.termsOfService.disclaimer')}</p>
          </div>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
              {t('legal.termsOfService.section1Title')}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed mb-3 pl-11">{t('legal.termsOfService.section1Desc1')}</p>
            <p className="text-[var(--muted)] leading-relaxed pl-11">{t('legal.termsOfService.section1Desc2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
              {t('legal.termsOfService.section2Title')}
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              {(t('legal.termsOfService.section2Points', { returnObjects: true }) as string[]).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
              {t('legal.termsOfService.section3Title')}
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              {(t('legal.termsOfService.section3Points', { returnObjects: true }) as string[]).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
              {t('legal.termsOfService.section4Title')}
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              {(t('legal.termsOfService.section4Points', { returnObjects: true }) as string[]).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
              {t('legal.termsOfService.section5Title')}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed mb-4 pl-11">{t('legal.termsOfService.section5Desc')}</p>
            <div className="bg-[var(--bg-1)] p-6 rounded-2xl ml-11 border border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--heritage-brown)] mb-2">{t('legal.termsOfService.legalContactTitle')}:</p>
              <div className="text-sm text-[var(--muted)] space-y-1">
                <p>{t('legal.termsOfService.founderLabel')}: {t('legal.termsOfService.founderName')}</p>
                <p>{t('legal.termsOfService.addressLabel')}: {t('legal.termsOfService.addressText')}</p>
                <p>{t('legal.termsOfService.emailLabel')}: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] hover:underline">talkto.kalamitra@gmail.com</a></p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
