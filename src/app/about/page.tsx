'use client';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/components/LanguageProvider';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--heritage-gold)]/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('aboutUs.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('aboutUs.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-12 relative overflow-hidden">

          {/* Corner flourish */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--heritage-gold)]/5 to-transparent"></div>

          <section className="space-y-6">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] border-l-4 border-[var(--heritage-gold)] pl-4">{t('aboutUs.formationTitle')}</h2>
            <div className="prose prose-lg text-[var(--muted)] leading-relaxed space-y-4 max-w-none">
              <p>{t('aboutUs.formationBody')}</p>
              <p>{t('aboutUs.visionBody')}</p>
              <p>{t('aboutUs.challengeBody')}</p>
              <p>{t('aboutUs.solutionBody')}</p>
              <p>{t('aboutUs.experienceBody')}</p>
              <p>{t('aboutUs.livingHubBody')}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] border-l-4 border-[var(--heritage-gold)] pl-4 mb-8">{t('aboutUs.featuresTitle')}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-[var(--bg-1)]/50 p-6 rounded-2xl border border-[var(--border)]">
                <h3 className="text-lg font-bold text-[var(--heritage-red)] uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--heritage-red)]"></span> {t('aboutUs.sellerFeaturesTitle')}
                </h3>
                <ul className="space-y-3 text-[var(--muted)]">
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.sellerFeatures.f1')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.sellerFeatures.f2')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.sellerFeatures.f3')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.sellerFeatures.f4')}</li>
                </ul>
              </div>
              <div className="space-y-4 bg-[var(--bg-1)]/50 p-6 rounded-2xl border border-[var(--border)]">
                <h3 className="text-lg font-bold text-[var(--heritage-green)] uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--heritage-green)]"></span> {t('aboutUs.buyerFeaturesTitle')}
                </h3>
                <ul className="space-y-3 text-[var(--muted)]">
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.buyerFeatures.f1')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.buyerFeatures.f2')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.buyerFeatures.f3')}</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> {t('aboutUs.buyerFeatures.f4')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-r from-[var(--bg-1)] to-[var(--bg-2)] rounded-2xl p-6 md:p-8 border border-[var(--border)]">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] mb-4">{t('aboutUs.contactLegalTitle')}</h2>
            <div className="space-y-2 text-[var(--muted)]">
              <p>{t('aboutUs.contactBody').split(': ')[0]}: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] font-medium hover:underline">talkto.kalamitra@gmail.com</a></p>
              <div className="pt-4 border-t border-[var(--heritage-gold)]/20 mt-4">
                <p><strong>{t('aboutUs.founderLabel')}:</strong> {t('aboutUs.founderName')}</p>
                <p><strong>{t('aboutUs.roleLabel')}:</strong> {t('aboutUs.roleName')}</p>
                <p><strong>{t('aboutUs.addressLabel')}:</strong> {t('aboutUs.addressText')}</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
