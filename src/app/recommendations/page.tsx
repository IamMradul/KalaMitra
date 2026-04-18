'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray } from '@/lib/translate'
import ProductCard from '@/components/ProductCard'
import { hammingDistanceHex as hammingHex } from '@/lib/image-similarity'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const ARViewer = dynamic(() => import('@/components/ARViewer'), { ssr: false })

interface ProductBase {
  id: string;
  title: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  seller_id: string;
  created_at: string;
  product_story?: string;
  is_virtual?: boolean;
}

interface ProductWithFeatures extends ProductBase {
  image_avg_r?: number;
  image_avg_g?: number;
  image_avg_b?: number;
  image_ahash?: string;
  is_virtual?: boolean;
}

export default function RecommendationsPage() {
  const { user, profile } = useAuth()
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [recommended, setRecommended] = useState<any[]>([])
  const [displayRecommended, setDisplayRecommended] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())

  // AR modal state
  const [arOpen, setArOpen] = useState(false)
  const [arImageUrl, setArImageUrl] = useState<string | undefined>(undefined)
  const [arProductType, setArProductType] = useState<'vertical' | 'horizontal'>('vertical')

  // Cart logic
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [cartStatus, setCartStatus] = useState<'success' | 'error' | null>(null)
  const [cartMessage, setCartMessage] = useState('')

  const addToCart = async (productId: string) => {
    try {
      if (!user) {
        const { addToAnonymousCart } = await import('@/utils/cart')
        addToAnonymousCart(productId, 1)
        setCartStatus('success')
        setCartMessage(t('cart.addedSuccess'))
        window.dispatchEvent(new CustomEvent('cartUpdated'))
        setCartModalOpen(true)
        return
      }

      const { data: existing } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', productId)
        .single()

      if (existing) {
        await supabase.from('cart').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('cart').insert({ buyer_id: user.id, product_id: productId, quantity: 1 })
      }
      setCartStatus('success')
      setCartMessage(t('cart.addedSuccess'))
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      setCartModalOpen(true)
    } catch (err) {
      setCartStatus('error')
      setCartMessage(t('cart.addedError'))
      setCartModalOpen(true)
    }
  }

  const toggleWishlist = async (productId: string) => {
    if (!user || !profile) {
      alert(t('common.loginRequired'))
      return
    }
    const newWishlist = new Set(wishlistIds)
    if (newWishlist.has(productId)) newWishlist.delete(productId)
    else newWishlist.add(productId)
    setWishlistIds(newWishlist)
    await supabase.from('profiles').update({ wishlist: Array.from(newWishlist) }).eq('id', user.id)
  }

  // Reuse logic from marketplace but expanded for a full page
  useEffect(() => {
    const fetchFullRecs = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        if (profile?.wishlist) setWishlistIds(new Set(profile.wishlist))

        const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
        const { data: activities } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', user.id)
          .gte('timestamp', thirtyDaysAgo)

        if (!activities || activities.length === 0) {
          setRecommended([])
          setLoading(false)
          return
        }

        const { data: allProducts } = await supabase.from('products').select('*, seller:profiles(name)')
        if (!allProducts) {
          setRecommended([])
          setLoading(false)
          return
        }

        const scores = new Map<string, number>()
        const viewedIds = new Set<string>()
        const viewedCategories = new Set<string>()
        const productById = new Map<string, any>()
        for (const p of allProducts) productById.set(p.id, p)

        for (const a of activities) {
          if (a.activity_type === 'view' && a.product_id) {
            viewedIds.add(a.product_id)
            const vp = productById.get(a.product_id)
            if (vp?.category) viewedCategories.add(String(vp.category))
          }
        }

        const viewedProducts = [...viewedIds].map(id => productById.get(id)).filter(Boolean)
        const tokenize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
        const toSet = (arr: string[]) => new Set(arr)
        const jaccard = (a: Set<string>, b: Set<string>) => {
          let inter = 0
          for (const t of a) if (b.has(t)) inter++
          const uni = a.size + b.size - inter
          return uni === 0 ? 0 : inter / uni
        }

        // Calculate scores
        for (const p of allProducts) {
          if (viewedIds.has(p.id)) continue
          let score = 0
          
          // Category boost
          if (p.category && viewedCategories.has(String(p.category))) score += 2

          // Content overlap
          let bestSim = 0
          for (const vp of viewedProducts) {
            const a = toSet([...tokenize(vp.title), ...tokenize(vp.description)])
            const b = toSet([...tokenize(p.title), ...tokenize(p.description)])
            bestSim = Math.max(bestSim, jaccard(a, b))
          }
          score += (bestSim * 5)

          // Image similarity
          if (p.image_ahash) {
             for (const vp of viewedProducts) {
               if (vp.image_ahash) {
                 const hd = hammingHex(p.image_ahash, vp.image_ahash)
                 const sim = Math.max(0, 1 - hd / 64)
                 score += (sim * 3)
               }
             }
          }
          
          if (score > 0) scores.set(p.id, score)
        }

        const ranked = allProducts
          .filter(p => scores.has(p.id))
          .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
          .slice(0, 24)

        setRecommended(ranked)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFullRecs()
  }, [user, profile])

  // Translation effect
  useEffect(() => {
    const translateRecs = async () => {
      if (recommended.length === 0) return
      const lang = currentLanguage
      const titles = recommended.map(p => p.title)
      const categories = recommended.map(p => p.category)
      const stories = recommended.map(p => p.product_story || p.description || '')
      
      try {
        const [trTitles, trCats, trStories] = await Promise.all([
          translateArray(titles, lang),
          translateArray(categories, lang),
          translateArray(stories, lang)
        ])

        const UNIQUE_SELLER_NAMES = [...new Set(recommended.map(p => p.seller?.name || ''))]
        const trSellerNames = await translateArray(UNIQUE_SELLER_NAMES, lang)
        const sellerMap: Record<string, string> = {}
        UNIQUE_SELLER_NAMES.forEach((name, i) => sellerMap[name] = trSellerNames[i] || name)
        
        const dp = recommended.map((p, idx) => ({
          ...p,
          title: trTitles[idx] || p.title,
          category: trCats[idx] || p.category,
          displayStory: trStories[idx] || p.product_story || p.description,
          translatedSellerName: sellerMap[p.seller?.name || '']
        }))
        setDisplayRecommended(dp)
      } catch {
        setDisplayRecommended(recommended)
      }
    }
    translateRecs()
  }, [recommended, currentLanguage])

  // Start narration for a product
  const [narratingId, setNarratingId] = useState<string | null>(null)
  const synthRef = React.useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null)

  const handleNarrate = (product: any) => {
    if (!('speechSynthesis' in window)) return;
    if (synthRef.current?.speaking) synthRef.current.cancel();
    // Use translated story for narration
    const narration = `${product.title}. ${product.displayStory || product.product_story || product.description || ''}`;
    const utter = new window.SpeechSynthesisUtterance(narration);
    utter.onend = () => setNarratingId(null);
    utter.onerror = () => setNarratingId(null);
    setNarratingId(product.id);
    synthRef.current?.speak(utter);
  }

  if (loading) return (
    <div className="min-h-screen heritage-bg pt-24 pb-12 px-4 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen heritage-bg pt-24 pb-12 px-4 text-center">
       <Sparkles className="w-16 h-16 text-orange-400 mx-auto mb-4" />
       <h1 className="text-3xl font-bold heritage-title mb-4">{t('marketplace.recsTitle')}</h1>
       <p className="text-[var(--muted)] mb-8">{t('marketplace.recsSignInPrompt')}</p>
       <Link href="/auth/signin" className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all">{t('navbar.signIn')}</Link>
    </div>
  )

  return (
    <div className="min-h-screen heritage-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold heritage-title flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-orange-500" />
              {t('marketplace.becauseViewedSimilar')}
            </h1>
            <p className="text-[var(--heritage-brown)] text-lg">{t('marketplace.recsSubtitle')}</p>
          </motion.div>
        </header>

        {displayRecommended.length === 0 ? (
          <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm">
             <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
             <p className="text-[var(--text)] text-xl font-medium">{t('marketplace.recsEmptyTitle')}</p>
             <p className="text-[var(--muted)] mt-2">{t('marketplace.recsEmptyDescription')}</p>
             <Link href="/marketplace" className="mt-6 inline-block text-orange-600 font-bold hover:underline">{t('marketplace.exploreMarketplace')} →</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayRecommended.map((displayP) => {
              const originalP = recommended.find(p => p.id === displayP.id)
              return (
                <ProductCard
                  key={displayP.id}
                  product={originalP}
                  displayProduct={displayP}
                  translatedSellerNames={displayP.translatedSellerName ? { [originalP.seller?.name]: displayP.translatedSellerName } : {}}
                  narratingId={narratingId}
                  wishlistIds={wishlistIds}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  onNarrate={() => handleNarrate(displayP)}
                  onStopNarrate={() => {
                    synthRef.current?.cancel();
                    setNarratingId(null);
                  }}
                  onAR={(url, type) => {
                    setArImageUrl(url);
                    setArProductType(type || 'vertical');
                    setArOpen(true);
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      <ARViewer open={arOpen} onClose={() => setArOpen(false)} imageUrl={arImageUrl} productType={arProductType} />
      
      {/* Cart Modal */}
      {cartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card)] rounded-xl shadow-2xl p-8 max-w-sm w-full relative flex flex-col items-center">
            <button className="absolute top-3 right-3 text-[var(--muted)] hover:text-[var(--text)] text-2xl" onClick={() => setCartModalOpen(false)}>&times;</button>
            {cartStatus === 'success' ? (
              <>
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">{t('cart.addedSuccessTitle') || 'Added to Cart!'}</h2>
                <p className="text-[var(--text)] mb-6">{cartMessage}</p>
                <Link href="/cart" className="w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 text-center">{t('cart.viewCart')}</Link>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">{t('cart.addedErrorTitle') || 'Could not add to Cart'}</h2>
                <p className="text-[var(--text)] mb-6">{cartMessage}</p>
                <button onClick={() => setCartModalOpen(false)} className="w-full px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl">{t('cart.close')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
