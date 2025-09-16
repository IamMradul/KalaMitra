'use client'
import Leaderboard from '../components/Leaderboard'
import Link from 'next/link'
import { ArrowRight, Palette, ShoppingBag, Users, Shield, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { useEffect, useState } from 'react'

export default function Home() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden heritage-bg">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {/* Mandala SVG or pattern can be placed here if available*/}
        </div>
        <div className="container-custom relative">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 heritage-card rounded-full border border-heritage-gold/40 shadow-soft mb-12 animate-slide-in-up">
              <Zap className="w-5 h-5 text-[var(--heritage-gold)] mr-3" />
              <span className="text-sm font-medium text-[var(--heritage-brown)]">{t('home.badge')}</span>
            </div>
            {/* Main Title */}
            <h1 className="text-6xl md:text-8xl font-bold heritage-title mb-8 leading-tight animate-slide-in-up animate-delay-100">
              {t('home.welcome')} <span className="heritage-title" key={`home-brand-${currentLanguage}`}>{t('brand.name')}</span>
            </h1>
            {/* Subtitle */}
            <p className="text-lg text-[var(--heritage-brown)] mb-8">
              {t('home.subtitle1')}
            </p>
            <p className="text-lg text-[var(--heritage-brown)] mb-8">
              {t('home.subtitle2')}
            </p>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-8 justify-center mb-20 animate-slide-in-up animate-delay-300">
              <Link href="/auth/signup?role=seller" className="btn-primary bg-white text-orange-600 hover:bg-gray-100 group">
                <span className="flex items-center justify-center space-x-3">
                  <span>{t('home.startSelling')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace" className="btn-secondary border-white text-white hover:bg-white hover:text-orange-600 group">
                <span className="flex items-center justify-center space-x-3">
                  <span>{t('home.startShopping')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-12 max-w-3xl mx-auto animate-slide-in-up animate-delay-400">
              <div className="text-center group">
                <div className="text-4xl font-bold text-gradient-primary mb-2 group-hover:scale-110 transition-transform duration-300">500+</div>
                <div className="text-gray-600 font-medium">{t('home.stats.artisans')}</div>
              </div>
              <div className="text-center group">
                <div className="text-4xl font-bold text-gradient-primary mb-2 group-hover:scale-110 transition-transform duration-300">1000+</div>
                <div className="text-gray-600 font-medium">{t('home.stats.products')}</div>
              </div>
              <div className="text-center group">
                <div className="text-4xl font-bold text-gradient-primary mb-2 group-hover:scale-110 transition-transform duration-300">50+</div>
                <div className="text-gray-600 font-medium">{t('home.stats.categories')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
  <section className="section-padding bg-[var(--bg-2)]/60 backdrop-blur-sm relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-orange-200 to-red-200 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--text)] mb-8 animate-slide-in-up">
              {t('home.whyChoose')} <span className="gradient-text-animated" key={`why-choose-brand-${currentLanguage}`}>{t('brand.name')}</span>?
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.whyChooseDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-100">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all duration-500 shadow-soft">
                <Zap className="w-12 h-12 text-gradient-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.feature1.title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                {t('home.feature1.desc')}
              </p>
            </div>

            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-200">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all duration-500 shadow-soft">
                <Users className="w-12 h-12 text-gradient-secondary" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.feature2.title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                {t('home.feature2.desc')}
              </p>
            </div>

            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-300">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all duration-500 shadow-soft">
                <Shield className="w-12 h-12 text-red-500" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.feature3.title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                {t('home.feature3.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="absolute top-10 right-20 w-80 h-80 bg-gradient-to-br from-orange-200 to-red-200 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 animate-slide-in-up">
              {t('home.howItWorks')} <span className="gradient-text-animated">{t('home.works')}</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.howItWorksDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-10">
            <div className="text-center group animate-slide-in-up animate-delay-100">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-medium hover:shadow-glow">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('home.step1.title')}</h3>
              <p className="text-gray-600">{t('home.step1.desc')}</p>
            </div>
            <div className="text-center group animate-slide-in-up animate-delay-200">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-medium hover:shadow-glow">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('home.step2.title')}</h3>
              <p className="text-gray-600">{t('home.step2.desc')}</p>
            </div>
            <div className="text-center group animate-slide-in-up animate-delay-300">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-medium hover:shadow-glow">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('home.step3.title')}</h3>
              <p className="text-gray-600">{t('home.step3.desc')}</p>
            </div>
            <div className="text-center group animate-slide-in-up animate-delay-400">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-medium hover:shadow-glow">
                4
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('home.step4.title')}</h3>
              <p className="text-gray-600">{t('home.step4.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-orange-500 to-red-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl floating-element"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 animate-slide-in-up">
              {t('home.readyToStart')}
            </h2>
            <p className="text-xl text-orange-100 mb-12 leading-relaxed animate-slide-in-up animate-delay-100">
              {t('home.readyToStartDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center animate-slide-in-up animate-delay-200">
              <Link href="/auth/signup?role=seller" className="btn-primary bg-white text-orange-600 hover:bg-gray-100 group">
                <span className="flex items-center justify-center space-x-3">
                  <span>{t('home.startSelling')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace" className="btn-secondary border-white text-white hover:bg-white hover:text-orange-600 group">
                <span className="flex items-center justify-center space-x-3">
                  <span>{t('home.startShopping')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Leaderboard Section (public, always visible) */}
      <section className="section-padding bg-white/80 dark:bg-gradient-to-br dark:from-[#18181b] dark:to-[#23232b]">
        <div className="container-custom">
          <div className="mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-yellow-500 via-orange-400 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">{t('leaderboard.title', { defaultValue: 'Leaderboard' })}</h2>
            <p className="text-lg text-gray-700 dark:text-yellow-100 font-medium">{t('leaderboard.desc', { defaultValue: 'Top buyers by MitraPoints (awarded for auction wins).' })}</p>
          </div>
          <Leaderboard embedMode />
        </div>
      </section>
    </div>
  )
}
