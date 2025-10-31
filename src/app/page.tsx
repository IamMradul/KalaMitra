'use client'
import Leaderboard from '../components/Leaderboard'
import VideoPlayer from '../components/VideoPlayer'
import Link from 'next/link'
import { ArrowRight, Palette, ShoppingBag, Users, Shield, Zap, Play, Star, Award, Heart, Sparkles } from 'lucide-react'
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden heritage-bg">
        {/* ...existing background and overlay code... */}
        <div className="container-custom relative z-10">
          <div className="text-center max-w-6xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-8 py-4 glass-card rounded-full border border-[var(--heritage-gold)]/30 shadow-soft mb-12 animate-slide-in-up">
              <Sparkles className="w-6 h-6 text-[var(--heritage-gold)] mr-3 animate-pulse" />
              <span className="text-lg font-semibold text-[var(--heritage-brown)]">{t('home.badgeHeritage')}</span>
            </div>

            {/* Main Title */}
            <h1 className="text-7xl md:text-9xl font-bold heritage-title mb-8 leading-tight animate-slide-in-up animate-delay-100 hero-title">
              {t('home.mainTitle')}
            </h1>
            
            {/* Subtitle */}
            <p className="text-2xl md:text-3xl text-[var(--heritage-brown)] mb-6 font-light animate-slide-in-up animate-delay-200 hero-subtitle">
              {t('home.subtitleMain')}
            </p>
            <p className="text-xl text-[var(--heritage-brown)]/80 mb-12 max-w-4xl mx-auto leading-relaxed animate-slide-in-up animate-delay-300">
              {t('home.subtitleExplore')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-slide-in-up animate-delay-400">
              <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white hover:scale-105 group flex items-center px-8 py-4 rounded-2xl shadow-glow">
                <span className="flex items-center justify-center space-x-3 text-center w-full">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-lg font-semibold">{t('home.exploreCollection')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/auth/signup?role=seller" className="btn-secondary border-2 border-[var(--heritage-gold)] text-[var(--heritage-gold)] hover:bg-[var(--heritage-gold)] hover:text-white group flex items-center px-8 py-4 rounded-2xl backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3 text-center w-full">
                  <Users className="w-6 h-6" />
                  <span className="text-lg font-semibold">{t('home.joinAsArtisan')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace?view=3d" className="btn-3d-bazaar bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform duration-300 group flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Palette className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
                  <span className="font-semibold text-lg">{t('home.bazaar3d')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-12 max-w-4xl mx-auto animate-slide-in-up animate-delay-500 stats-grid">
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">500+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">{t('home.statsArtisans')}</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">1000+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">{t('home.statsProducts')}</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">50+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">{t('home.statsCategories')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Showcase Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[var(--bg-2)]/80 to-white/60 backdrop-blur-sm relative overflow-visible video-section">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] mb-6 md:mb-8 animate-slide-in-up">
              {t('home.videoSectionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.videoSectionDesc')}
            </p>
          </div>

          {/* Video Container */}
          <div className="relative max-w-6xl mx-auto animate-slide-in-up animate-delay-200 mb-12 md:mb-16">
            {/* Decorative Border */}
            <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-[var(--heritage-gold)] via-[var(--heritage-red)] to-[var(--heritage-gold)] rounded-2xl md:rounded-3xl p-1">
              <div className="bg-white rounded-xl md:rounded-3xl p-1 md:p-2">
                <VideoPlayer
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  poster="/api/placeholder?width=800&height=450&text=KalaMitra+Craftsmanship"
                  title={t('home.videoPlayerTitle')}
                  description={t('home.videoPlayerDesc')}
                  className="aspect-video rounded-lg md:rounded-2xl overflow-hidden shadow-2xl"
                />
              </div>
            </div>
          </div>
            
          {/* Video Description */}
          <div className="text-center animate-slide-in-up animate-delay-300">
            <h3 className="text-xl md:text-2xl font-bold text-[var(--text)] mb-4">{t('home.videoStoriesTitle')}</h3>
            <p className="text-base md:text-lg text-[var(--muted)] max-w-3xl mx-auto leading-relaxed mb-8">
              {t('home.videoStoriesDesc')}
            </p>
            
            {/* Video Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">{t('home.videoFeature1Title')}</h4>
                <p className="text-sm text-[var(--muted)]">{t('home.videoFeature1Desc')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">{t('home.videoFeature2Title')}</h4>
                <p className="text-sm text-[var(--muted)]">{t('home.videoFeature2Desc')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">{t('home.videoFeature3Title')}</h4>
                <p className="text-sm text-[var(--muted)]">{t('home.videoFeature3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section-padding relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="absolute top-10 right-20 w-80 h-80 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--text)] mb-8 animate-slide-in-up">
              {t('home.featuredCollectionsTitle')}
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.featuredCollectionsDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Product Card 1 */}
            <div className="card-glass p-8 text-center group animate-slide-in-up animate-delay-100 hover-lift">
              <div className="relative mb-8">
                <div className="w-full h-64 bg-gradient-to-br from-[var(--heritage-gold)]/20 to-[var(--heritage-red)]/20 rounded-2xl flex items-center justify-center shadow-medium">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                      <Heart className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">{t('home.featuredCard1Title')}</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard1Subtitle')}</h3>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard1Subtitle')}</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">{t('home.featuredCard1Desc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">{t('home.featuredCard1Price')}</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  {t('home.viewCollection')}
                </Link>
              </div>
            </div>

            {/* Product Card 2 */}
            <div className="card-glass p-8 text-center group animate-slide-in-up animate-delay-200 hover-lift">
              <div className="relative mb-8">
                <div className="w-full h-64 bg-gradient-to-br from-[var(--heritage-green)]/20 to-[var(--heritage-blue)]/20 rounded-2xl flex items-center justify-center shadow-medium">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                      <Award className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">{t('home.featuredCard2Title')}</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard2Subtitle')}</h3>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard2Subtitle')}</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">{t('home.featuredCard2Desc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">{t('home.featuredCard2Price')}</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-green)] to-[var(--heritage-blue)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  {t('home.viewCollection')}
                </Link>
              </div>
            </div>

            {/* Product Card 3 */}
            <div className="card-glass p-8 text-center group animate-slide-in-up animate-delay-300 hover-lift">
              <div className="relative mb-8">
                <div className="w-full h-64 bg-gradient-to-br from-[var(--heritage-red)]/20 to-[var(--heritage-accent)]/20 rounded-2xl flex items-center justify-center shadow-medium">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">{t('home.featuredCard3Title')}</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard3Subtitle')}</h3>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('home.featuredCard3Subtitle')}</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">{t('home.featuredCard3Desc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">{t('home.featuredCard3Price')}</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-red)] to-[var(--heritage-accent)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  {t('home.viewCollection')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Bazaar Feature Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] mb-8 animate-slide-in-up">
              {t('home.bazaarFeatureTitle')}
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.bazaarFeatureDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Side - Description */}
            <div className="animate-slide-in-up animate-delay-200">
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('home.bazaarFeature1Title')}</h3>
                    <p className="text-[var(--muted)]">{t('home.bazaarFeature1Desc')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('home.bazaarFeature2Title')}</h3>
                    <p className="text-[var(--muted)]">{t('home.bazaarFeature2Desc')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('home.bazaarFeature3Title')}</h3>
                    <p className="text-[var(--muted)]">{t('home.bazaarFeature3Desc')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <Link href="/marketplace?view=3d" className="btn-3d-bazaar inline-flex items-center space-x-3 px-8 py-4 rounded-2xl">
                  <Palette className="w-6 h-6 animate-pulse" />
                  <span className="text-lg font-semibold">{t('home.enter3dBazaar')}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* Right Side - Visual */}
            <div className="animate-slide-in-up animate-delay-300">
              <div className="relative aspect-square flex items-center justify-center rounded-3xl shadow-2xl bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30">
                <div style={{position: 'absolute', inset: 0, zIndex: 0}}>
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/Ge7mo6KzMTo?autoplay=1&mute=1&loop=1&playlist=Ge7mo6KzMTo&controls=0&modestbranding=1&rel=0&showinfo=0&fs=0&disablekb=1"
                    title="KalaMitra 3D Bazaar Preview"
                    allow="autoplay; encrypted-media"
                    allowFullScreen={false}
                    className="aspect-square rounded-2xl overflow-hidden shadow-2xl"
                    style={{ minHeight: '320px', minWidth: '320px', border: 'none', pointerEvents: 'none' }}
                    frameBorder="0"
                  ></iframe>
                </div>
                <div style={{position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'auto'}} className="rounded-2xl bg-transparent" />
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-60"></div>
                <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-60"></div>
                <div className="absolute top-1/2 -left-6 w-4 h-4 bg-gradient-to-br from-pink-400 to-red-400 rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USP/Features Section */}
      <section className="section-padding bg-gradient-to-br from-[var(--bg-2)]/80 to-white/60 backdrop-blur-sm relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--text)] mb-8 animate-slide-in-up">
              {t('home.uspTitle')}
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.uspDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Authenticity Feature */}
            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-100 hover-lift">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-all duration-500 shadow-glow">
                  <Award className="w-12 h-12 text-white" />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-gold)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.usp1Title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">{t('home.usp1Desc')}</p>
            </div>

            {/* Handcrafted Quality Feature */}
            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-200 hover-lift">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-all duration-500 shadow-glow">
                  <Heart className="w-12 h-12 text-white" />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.usp2Title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">{t('home.usp2Desc')}</p>
            </div>

            {/* Heritage Preservation Feature */}
            <div className="card-glass p-10 text-center group animate-slide-in-up animate-delay-300 hover-lift">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-all duration-500 shadow-glow">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-[var(--heritage-accent)] to-[var(--heritage-red)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">{t('home.usp3Title')}</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">{t('home.usp3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="absolute top-10 right-20 w-80 h-80 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--text)] mb-8 animate-slide-in-up">
              {t('home.howItWorksTitle')}
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.howItWorksDesc2')}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-10">
            {/* Step 1 */}
            <div className="text-center group animate-slide-in-up animate-delay-100">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center mx-auto text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-glow">
                1
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-gold)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{t('home.stepDiscoverTitle')}</h3>
              <p className="text-[var(--muted)]">{t('home.stepDiscoverDesc')}</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group animate-slide-in-up animate-delay-200">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center mx-auto text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-glow">
                2
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{t('home.stepChooseTitle')}</h3>
              <p className="text-[var(--muted)]">{t('home.stepChooseDesc')}</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group animate-slide-in-up animate-delay-300">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center mx-auto text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-glow">
                3
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-[var(--heritage-accent)] to-[var(--heritage-red)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{t('home.stepOrderTitle')}</h3>
              <p className="text-[var(--muted)]">{t('home.stepOrderDesc')}</p>
            </div>

            {/* Step 4 */}
            <div className="text-center group animate-slide-in-up animate-delay-400">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center mx-auto text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 shadow-glow">
                4
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full opacity-60"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full opacity-40"></div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{t('home.stepEnjoyTitle')}</h3>
              <p className="text-[var(--muted)]">{t('home.stepEnjoyDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-[var(--heritage-gold)] via-[var(--heritage-red)] to-[var(--heritage-gold)] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl floating-element"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 animate-slide-in-up">
              {t('home.ctaTitle')}
            </h2>
            <p className="text-xl text-white/90 mb-12 leading-relaxed animate-slide-in-up animate-delay-100">
              {t('home.ctaDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-slide-in-up animate-delay-200">
              <Link href="/marketplace" className="btn-primary bg-white text-[var(--heritage-gold)] hover:bg-gray-100 group px-8 py-4 rounded-2xl shadow-glow">
                <span className="flex items-center justify-center space-x-3">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-lg font-semibold">{t('home.startShopping')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/auth/signup?role=seller" className="btn-secondary border-2 border-white text-white hover:bg-white hover:text-[var(--heritage-gold)] group px-8 py-4 rounded-2xl backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Users className="w-6 h-6" />
                  <span className="text-lg font-semibold">{t('home.becomeArtisan')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace?view=3d" className="btn-3d-bazaar bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-white shadow-lg hover:scale-105 transition-transform duration-300 group flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Palette className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
                  <span className="font-semibold text-lg">{t('home.explore3dBazaar')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Leaderboard Section */}
      <section className="section-padding bg-gradient-to-br from-[var(--bg-2)]/80 to-white/60 backdrop-blur-sm relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-2xl floating-element"></div>
        </div>

        <div className="container-custom relative">
          <div className="mb-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 gradient-text-animated animate-slide-in-up">
              {t('home.leaderboardTitle')}
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              {t('home.leaderboardDesc')}
            </p>
          </div>
          <div className="animate-slide-in-up animate-delay-200">
          <Leaderboard embedMode />
          </div>
        </div>
      </section>
    </div>
  )
}
