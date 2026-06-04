"use client";

import { useTranslation } from 'react-i18next';

export default function SuccessStoriesPage() {
  const { t } = useTranslation();

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('successStories.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('successStories.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-12 text-center space-y-8 relative overflow-hidden">

          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--heritage-gold)] via-[var(--heritage-red)] to-[var(--heritage-gold)]"></div>

          <div className="max-w-xl mx-auto space-y-4">
            <span className="text-6xl animate-pulse">✨</span>
            <h2 className="text-3xl font-serif font-bold text-[var(--heritage-brown)]">{t('successStories.comingSoon')}</h2>
            <p className="text-[var(--muted)] text-lg leading-relaxed">
              {t('successStories.body')}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <a href="/auth/signup" className="px-8 py-3 bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-1 shadow-md">
              {t('successStories.shareStory')}
            </a>
            <a href="/auth/signup" className="px-8 py-3 border-2 border-[var(--heritage-gold)] text-[var(--heritage-gold)] rounded-xl font-semibold hover:bg-[var(--heritage-gold)] hover:text-white transition-all">
              {t('successStories.join')}
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}
