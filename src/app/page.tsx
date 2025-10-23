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
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating Mandala Patterns */}
          <div className="absolute top-20 left-10 w-32 h-32 opacity-5 animate-float">
            <div className="w-full h-full bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full blur-xl"></div>
          </div>
          <div className="absolute top-40 right-20 w-24 h-24 opacity-8 animate-float-slow">
            <div className="w-full h-full bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full blur-lg"></div>
          </div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 opacity-6 animate-float">
            <div className="w-full h-full bg-gradient-to-br from-[var(--heritage-accent)] to-[var(--heritage-gold)] rounded-full blur-2xl"></div>
          </div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 opacity-7 animate-float-slow">
            <div className="w-full h-full bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-green)] rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Glassmorphism-Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 backdrop-blur-sm"></div>

        <div className="container-custom relative z-10">
          <div className="text-center max-w-6xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-8 py-4 glass-card rounded-full border border-[var(--heritage-gold)]/30 shadow-soft mb-12 animate-slide-in-up">
              <Sparkles className="w-6 h-6 text-[var(--heritage-gold)] mr-3 animate-pulse" />
              <span className="text-lg font-semibold text-[var(--heritage-brown)]">Authentic Indian Heritage</span>
            </div>

            {/* Main Title */}
            <h1 className="text-7xl md:text-9xl font-bold heritage-title mb-8 leading-tight animate-slide-in-up animate-delay-100 hero-title">
              Discover <span className="gradient-text-animated">KalaMitra</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-2xl md:text-3xl text-[var(--heritage-brown)] mb-6 font-light animate-slide-in-up animate-delay-200 hero-subtitle">
              Where Tradition Meets Modernity
            </p>
            <p className="text-xl text-[var(--heritage-brown)]/80 mb-12 max-w-4xl mx-auto leading-relaxed animate-slide-in-up animate-delay-300">
              Explore our curated collection of authentic Indian traditional items, handcrafted by skilled artisans 
              and brought to you through our innovative e-commerce platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-slide-in-up animate-delay-400">
              <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white hover:scale-105 group flex items-center px-8 py-4 rounded-2xl shadow-glow">
                <span className="flex items-center justify-center space-x-3 text-center w-full">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-lg font-semibold">Explore Collection</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/auth/signup?role=seller" className="btn-secondary border-2 border-[var(--heritage-gold)] text-[var(--heritage-gold)] hover:bg-[var(--heritage-gold)] hover:text-white group flex items-center px-8 py-4 rounded-2xl backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3 text-center w-full">
                  <Users className="w-6 h-6" />
                  <span className="text-lg font-semibold">Join as Artisan</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace?view=3d" className="btn-3d-bazaar bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform duration-300 group flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Palette className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
                  <span className="font-semibold text-lg">3D Bazaar</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-12 max-w-4xl mx-auto animate-slide-in-up animate-delay-500 stats-grid">
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">500+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">Skilled Artisans</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">1000+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">Unique Products</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-bold text-gradient-primary mb-3 group-hover:scale-110 transition-transform duration-300">50+</div>
                <div className="text-[var(--heritage-brown)] font-semibold text-lg">Categories</div>
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
              Discover Our <span className="gradient-text-animated">Unique Craftsmanship</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              Watch our artisans create beautiful traditional items using centuries-old techniques passed down through generations.
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
                  title="KalaMitra Craftsmanship"
                  description="Experience traditional artistry"
                  className="aspect-video rounded-lg md:rounded-2xl overflow-hidden shadow-2xl"
                />
              </div>
            </div>
          </div>
            
          {/* Video Description */}
          <div className="text-center animate-slide-in-up animate-delay-300">
            <h3 className="text-xl md:text-2xl font-bold text-[var(--text)] mb-4">Discover Our Artisan Stories</h3>
            <p className="text-base md:text-lg text-[var(--muted)] max-w-3xl mx-auto leading-relaxed mb-8">
              Watch our skilled artisans create beautiful traditional items using centuries-old techniques. 
              Each piece tells a story of cultural heritage, passed down through generations of master craftsmen.
            </p>
            
            {/* Video Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">Authentic Craftsmanship</h4>
                <p className="text-sm text-[var(--muted)]">Watch traditional techniques in action</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">Master Artisans</h4>
                <p className="text-sm text-[var(--muted)]">Meet the skilled craftsmen behind each piece</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-[var(--text)] mb-2">Cultural Heritage</h4>
                <p className="text-sm text-[var(--muted)]">Preserving traditions for future generations</p>
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
              Featured <span className="gradient-text-animated">Collections</span>
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              Handpicked traditional items that showcase the rich heritage and exquisite craftsmanship of India.
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
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">Handwoven Textiles</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">Traditional Sarees</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">
                Exquisite handwoven sarees from different regions of India, each telling a unique story of tradition and craftsmanship.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">₹2,999</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  View Collection
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
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">Artisan Jewelry</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">Gold & Silver Jewelry</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">
                Beautifully crafted traditional jewelry pieces that reflect the rich cultural heritage and skilled artistry of Indian craftsmen.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">₹5,999</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-green)] to-[var(--heritage-blue)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  View Collection
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
                    <h3 className="text-xl font-bold text-[var(--heritage-brown)]">Home Decor</h3>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--heritage-red)] to-[var(--heritage-accent)] rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-4">Traditional Pottery</h3>
              <p className="text-[var(--muted)] leading-relaxed mb-6">
                Handcrafted pottery and home decor items that bring the essence of Indian tradition into your modern living spaces.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--heritage-gold)]">₹1,999</span>
                <Link href="/marketplace" className="btn-primary bg-gradient-to-r from-[var(--heritage-red)] to-[var(--heritage-accent)] text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-300">
                  View Collection
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
              Experience Our <span className="gradient-text-animated">3D Bazaar</span>
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              Step into a virtual marketplace where you can explore traditional items in an immersive 3D environment, 
              bringing the authentic shopping experience right to your screen.
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
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Immersive Shopping</h3>
                    <p className="text-[var(--muted)]">Walk through virtual stalls and interact with products in a realistic 3D environment.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Interactive Experience</h3>
                    <p className="text-[var(--muted)]">Rotate, zoom, and examine products from every angle before making a purchase.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Authentic Atmosphere</h3>
                    <p className="text-[var(--muted)]">Experience the vibrant atmosphere of traditional Indian markets from anywhere in the world.</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <Link href="/marketplace?view=3d" className="btn-3d-bazaar inline-flex items-center space-x-3 px-8 py-4 rounded-2xl">
                  <Palette className="w-6 h-6 animate-pulse" />
                  <span className="text-lg font-semibold">Enter 3D Bazaar</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* Right Side - Visual */}
            <div className="animate-slide-in-up animate-delay-300">
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-3xl p-8 flex items-center justify-center shadow-2xl">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse">
                      <Palette className="w-16 h-16 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text)] mb-2">3D Marketplace</h3>
                    <p className="text-[var(--muted)] mb-4">Experience shopping like never before</p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
                
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
              Why Choose <span className="gradient-text-animated">KalaMitra</span>?
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              We bridge the gap between traditional craftsmanship and modern convenience, ensuring authentic quality and cultural preservation.
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
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">100% Authentic</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                Every item is verified for authenticity and sourced directly from skilled artisans, ensuring genuine traditional craftsmanship.
              </p>
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
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">Handcrafted Excellence</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                Each piece is meticulously crafted by master artisans using traditional techniques passed down through generations.
              </p>
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
              <h3 className="text-2xl font-semibold text-[var(--text)] mb-6">Cultural Heritage</h3>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                Supporting traditional artisans and preserving India&apos;s rich cultural heritage for future generations.
              </p>
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
              How <span className="gradient-text-animated">KalaMitra</span> Works
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              Experience the seamless journey from discovering authentic traditional items to bringing them home.
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
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">Discover</h3>
              <p className="text-[var(--muted)]">Browse our curated collection of authentic traditional items from skilled artisans across India.</p>
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
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">Choose</h3>
              <p className="text-[var(--muted)]">Select your favorite items and learn about their cultural significance and artisan stories.</p>
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
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">Order</h3>
              <p className="text-[var(--muted)]">Place your order with secure payment and enjoy our premium packaging and delivery service.</p>
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
              <h3 className="text-xl font-semibold text-[var(--text)] mb-3">Enjoy</h3>
              <p className="text-[var(--muted)]">Receive your authentic traditional items and become part of preserving India&apos;s cultural heritage.</p>
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
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-white/90 mb-12 leading-relaxed animate-slide-in-up animate-delay-100">
              Join thousands of customers who have discovered the beauty of authentic Indian traditional items through KalaMitra.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-slide-in-up animate-delay-200">
              <Link href="/marketplace" className="btn-primary bg-white text-[var(--heritage-gold)] hover:bg-gray-100 group px-8 py-4 rounded-2xl shadow-glow">
                <span className="flex items-center justify-center space-x-3">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-lg font-semibold">Start Shopping</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/auth/signup?role=seller" className="btn-secondary border-2 border-white text-white hover:bg-white hover:text-[var(--heritage-gold)] group px-8 py-4 rounded-2xl backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Users className="w-6 h-6" />
                  <span className="text-lg font-semibold">Become an Artisan</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
              <Link href="/marketplace?view=3d" className="btn-3d-bazaar bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-white shadow-lg hover:scale-105 transition-transform duration-300 group flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
                <span className="flex items-center justify-center space-x-3">
                  <Palette className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
                  <span className="font-semibold text-lg">Explore 3D Bazaar</span>
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
              Top Artisan Supporters
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto animate-slide-in-up animate-delay-100">
              Recognizing our most dedicated customers who support traditional artisans through their purchases.
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
