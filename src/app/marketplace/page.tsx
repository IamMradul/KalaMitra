
'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase' // Only needed for wishlist, cart, recommendations
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import { hammingDistanceHex as hammingHex } from '@/lib/image-similarity'
import { Database } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Fuse from 'fuse.js'
const Market3DButton = dynamic(() => import('@/components/Market3DButton'), { ssr: false })
const ARViewer = dynamic(() => import('@/components/ARViewer'), { ssr: false })

import ProductCard from '@/components/ProductCard'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useInView } from 'react-intersection-observer'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

// Skeleton loader for product card
function ProductCardSkeleton() {
  return (
    <div className="animate-pulse bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="h-48 bg-[var(--bg-3)] flex items-center justify-center">
        <div className="w-3/4 h-3/4 bg-gradient-to-br from-orange-100 to-red-100 rounded" />
      </div>
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
        <div className="h-6 bg-orange-100 rounded w-1/3" />
      </div>
    </div>
  )
}
import type { Product as ThreeProduct } from '@/types/product'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray } from '@/lib/translate'

type ProductBase = Database['public']['Tables']['products']['Row']
type ProductWithFeatures = ProductBase & {
  image_avg_r?: number | null
  image_avg_g?: number | null
  image_avg_b?: number | null
  image_ahash?: string | null
}
export type Product = ProductBase & {
  seller: {
    name: string
  }
  isCollaborative?: boolean
  collaborators?: {
    id: string
    name: string
  }[]
  product_type?: string | null | undefined;
  product_story?: string | null;
}

type CollabJoin = {
  product_id: string
  // Supabase sometimes returns relation joins as arrays. Accept both shapes.
  collaboration: ({
    id: string
    initiator_id: string
    partner_id: string
    status: string
    initiator?: { id: string; name?: string }[] | { id: string; name?: string } | null
    partner?: { id: string; name?: string }[] | { id: string; name?: string } | null
  } | null) | ({
    id: string
    initiator_id: string
    partner_id: string
    status: string
    initiator?: { id: string; name?: string }[] | null
    partner?: { id: string; name?: string }[] | null
  }[])
}

export default function Marketplace() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">{t('common.loading')}</p></div></div>}>
      <MarketplaceContent />
    </Suspense>
  )
}

function MarketplaceContent() {
  // Onboarding tour steps
  type TourStep = {
    element: string;
    intro: string;

  };
  const getTourSteps = (): TourStep[] => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    return [
      {
        element: isMobile ? '#navbar-brand-mobile' : 'a[href="/marketplace"]',
        intro: `<span style="font-size:1.2em">💜 <b>${t('marketplace.page.welcome', 'Welcome to KalaMitra!')}</b></span><br/>This is the <b>marketplace</b> where you can explore unique products.`,
      },
      {
        element: 'input[aria-label]',
        intro: `<span style="font-size:1.1em">🔍 <b>${t('marketplace.page.searchTourTitle', 'Search')}</b></span><br/>Use this <b>search box</b> to find products by name, category, or description.`,
      },
      {
        element: '#joyride-3d-bazaar-btn',
        intro: `<span style="font-size:1.1em">🛍️ <b>${t('marketplace.page.bazaar3dTourTitle', '3D Bazaar')}</b></span><br/>Click here to view the <b>immersive 3D bazaar</b> experience.`,
      },
      {
        element: '#joyride-add-to-cart-btn',
        intro: `<span style="font-size:1.1em">🛒 <b>${t('marketplace.page.addToCartTourTitle', 'Add to Cart')}</b></span><br/>Add products to your cart using this button.`,

      },
      {
        element: '#joyride-wishlist-btn',
        intro: `<span style="font-size:1.1em">💜 <b>${t('marketplace.page.wishlistTourTitle', 'Wishlist')}</b></span><br/>Add products to your wishlist using this button.`,
      },
      {
        element: '#joyride-ar-btn',
        intro: `<span style="font-size:1.1em">📱 <b>${t('marketplace.page.arTourTitle', 'View in AR')}</b></span><br/>See the product in <b>Augmented Reality</b> using this button.`,
      },
      {
        element: '#joyride-speaker-btn',
        intro: `<span style="font-size:1.1em">🔊 <b>${t('marketplace.page.listenTourTitle', 'Listen')}</b></span><br/>Hear the product story using this speaker button.`,
      },
    ];
  };

  // Auto-start Intro.js tour for new users (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Wait for KalaMitra Navbar intro to finish before starting marketplace tour
    const navbarIntroSeen = localStorage.getItem('hasSeenKalaMitraNavbarIntro');
    const marketplaceIntroSeen = localStorage.getItem('hasSeenKalaMitraIntro');
    if (!navbarIntroSeen) {
      // Poll until navbar intro is complete
      const pollNavbarIntro = () => {
        const navbarIntroSeenNow = localStorage.getItem('hasSeenKalaMitraNavbarIntro');
        if (navbarIntroSeenNow) {
          startMarketplaceTour();
        } else {
          setTimeout(pollNavbarIntro, 200);
        }
      };
      pollNavbarIntro();
      return;
    }
    if (!marketplaceIntroSeen) {
      startMarketplaceTour();
    }

    function startMarketplaceTour() {
      Promise.all([
        import('intro.js'),
      ]).then(([introJsModule]) => {
        const introJs = introJsModule.default;
        const steps = getTourSteps();
        // Wait for all step targets to exist
        const checkAllTargets = () => {
          const allExist = steps.every(step => step.element && document.querySelector(step.element));
          if (allExist) {
            const intro = introJs().setOptions({
              steps,
              showProgress: true,
              showBullets: false,
              exitOnOverlayClick: true,
              exitOnEsc: false,
              scrollToElement: true,
              overlayOpacity: typeof window !== 'undefined' && window.innerWidth >= 768 ? 0.3 : 0.7,
              tooltipClass: typeof window !== 'undefined' && window.innerWidth < 768
                ? 'kalamitra-intro-theme kalamitra-intro-theme-mobile'
                : 'kalamitra-intro-theme',
              highlightClass: 'kalamitra-intro-highlight',
              nextLabel: 'Next →',
              prevLabel: '← Back',
              doneLabel: '✨ Done',
              skipLabel: 'Skip',
            });
            intro.onchange(function (targetElement) {
              const currentStep = typeof intro.currentStep === 'function' ? intro.currentStep() : 0;
              if (typeof currentStep === 'number' && steps[currentStep]) {
                const step = steps[currentStep];
                if (step.element === '#joyride-add-to-cart-btn') {
                  const el = document.querySelector('#joyride-add-to-cart-btn');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }
            });
            intro.oncomplete(() => {
              localStorage.setItem('hasSeenKalaMitraIntro', 'true');
            });
            intro.onexit(() => {
              localStorage.setItem('hasSeenKalaMitraIntro', 'true');
            });
            intro.start();
          } else {
            setTimeout(checkAllTargets, 100);
          }
        };
        checkAllTargets();
      });
    }
  }, []);
  // Helper: map category to AR orientation
  // Voice narration state
  const [narratingId, setNarratingId] = useState<string | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)


  // Search is backend-driven (server filtering + pagination)


  // Helper: get BCP-47 code for narration
  const getNarrationLang = () => {
    const lang = currentLanguage || i18n.language || 'en'
    const langMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', urdu: 'ur-IN',
      as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
    }
    return langMap[lang] || lang
  }

  // Start narration for a product
  const handleNarrate = (product: Product) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.')
      return
    }
    // Stop any ongoing narration
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel()
      setNarratingId(null)
    }
    // Compose narration text: title + product_story (heritage story)
    const title = displayProducts.find(p => p.id === product.id)?.title || product.title
    // Prefer product_story, fallback to description if not present
    const story = typeof product.product_story === 'string' && product.product_story
      ? product.product_story
      : product.description || ''
    const narration = `${title}. ${story}`
    const utter = new window.SpeechSynthesisUtterance(narration)
    utter.lang = getNarrationLang()
    utter.onend = () => setNarratingId(null)
    utter.onerror = () => setNarratingId(null)
    utteranceRef.current = utter
    setNarratingId(product.id)
    synthRef.current?.speak(utter)
  }

  // Stop narration
  const handleStopNarrate = () => {
    synthRef.current?.cancel()
    setNarratingId(null)
  }
  const { user, profile } = useAuth()
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()
  const searchParams = useSearchParams()

  // SWR Fetcher for marketplace products (backend API, paginated)
  const PRODUCTS_PER_PAGE = 12;
  const [totalProducts, setTotalProducts] = useState(0)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCollaborativeOnly, setShowCollaborativeOnly] = useState(false)
  const [showVirtualOnly, setShowVirtualOnly] = useState(false)
  const [semanticResults, setSemanticResults] = useState<Product[]>([])
  const [searchMeta, setSearchMeta] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [semanticResolved, setSemanticResolved] = useState(true)
  const [realtimeUpdates, setRealtimeUpdates] = useState(0)

  // Autocomplete UI State
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  // Initialize Fuse.js for fast typo correction on frontend
  const popularKeywords = useMemo(() => [
    "handmade", "terracotta", "pottery", "decor", "gifts", "gift", "diya", 
    "wall art", "clay pot", "vase", "sculpture", "painting", "saree", "handicraft",
    "snack", "cookies", "biscuit", "jewelry"
  ], [])

  const fuse = useMemo(() => new Fuse(popularKeywords.map(k => ({ word: k })), {
    keys: ['word'],
    threshold: 0.4
  }), [popularKeywords])

  const dedupeById = useCallback((items: Product[]) => {
    const map = new Map<string, Product>()
    for (const p of items) map.set(p.id, p)
    return Array.from(map.values())
  }, [])
  const productsFetcher = async ([_key, lang, category, isCollab, isVirtual, updates]: readonly any[]) => {
    const qs = new URLSearchParams({
      page: '1',
      pageSize: String(PRODUCTS_PER_PAGE),
      lang,
      includeCategories: 'true',
    })
    if (category) qs.set('category', category)
    if (isCollab === '1') qs.set('collaborativeOnly', 'true')
    if (isVirtual === '1') qs.set('virtualOnly', 'true')
    if (updates > 0) qs.set('bypassCache', 'true')

    const res = await fetch(`/api/marketplace/products?${qs.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const json = await res.json();
    const products = json.products || [];
    const categoriesList = Array.isArray(json.categories) ? (json.categories as string[]) : [];
    return { products, categories: categoriesList, total: typeof json.total === 'number' ? json.total : 0 };
  }

  const swrKey = useMemo(() => {
    const lang = currentLanguage || i18n.language || 'en'
    return [
      'marketplace-products',
      lang,
      selectedCategory,
      showCollaborativeOnly ? '1' : '0',
      showVirtualOnly ? '1' : '0',
      realtimeUpdates,
    ] as const
  }, [currentLanguage, i18n.language, selectedCategory, showCollaborativeOnly, showVirtualOnly, realtimeUpdates])

  const { data: swrData, error: swrError, isLoading: swrLoading, isValidating: swrValidating } = useSWR(swrKey, productsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    // We MUST allow the initial fetch when there's no cache yet (otherwise skeleton hangs forever).
    // To avoid refetching when navigating away/back, we rely on SWR's in-memory cache + a long dedupe window.
    revalidateOnMount: true,
    keepPreviousData: true,
    dedupingInterval: 1000 * 60 * 60, // 1 hour
  })

  const [products, setProducts] = useState<Product[]>([])
  // Products list is server-filtered

  // Load from SWR
  useEffect(() => {
    if (swrData) {
      setProducts(dedupeById(swrData.products))
      setCategories(swrData.categories)
      setTotalProducts(swrData.total || 0)
    }
  }, [swrData, dedupeById])

  // Real-time listener for products and collaborations
  useEffect(() => {
    const channel = supabase
      .channel('marketplace_realtime_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collaborative_products' },
        () => {
          setRealtimeUpdates(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collaborations' },
        () => {
          setRealtimeUpdates(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          setRealtimeUpdates(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // If needed later, you can render an error state from `swrError`.

  const [categories, setCategories] = useState<string[]>([])
  const [displayProducts, setDisplayProducts] = useState<Product[]>([])
  const [displayCategories, setDisplayCategories] = useState<string[]>([])
  const [translatedSellerNames, setTranslatedSellerNames] = useState<Record<string, string>>({})
  const [auctionedProductIds, setAuctionedProductIds] = useState<string[]>([])
  const [searchLogTimer, setSearchLogTimer] = useState<NodeJS.Timeout | null>(null)
  const [recommended, setRecommended] = useState<ProductBase[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [displayRecommended, setDisplayRecommended] = useState<ProductBase[]>([])
  // Pagination / Load More state (API-driven)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

  // Products are server-filtered; what we have in `products` is already the filtered list.
  const isSemanticSearchActive = searchTerm.trim().length > 0

  useEffect(() => {
    if (!isSemanticSearchActive) {
      setSemanticResults([])
      setSearchMeta(null)
      setSemanticResolved(true)
      return
    }
    setSemanticResolved(false)
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchTerm.trim() }),
        })
        if (!response.ok) {
          setSemanticResults([])
          return
        }
        const data = await response.json()
        const semanticResultsRaw = data.results || []
        setSearchMeta(data.meta || null)
        const enrichedResults = (Array.isArray(semanticResultsRaw) ? semanticResultsRaw : [])
          .map((result: ProductBase) => {
            const fullProduct = products.find((p) => p.id === result.id) as Product | undefined
            const resultWithSeller = result as Product
            return {
              ...result,
              seller: fullProduct?.seller || resultWithSeller?.seller || { name: 'Unknown' },
              isCollaborative: fullProduct?.isCollaborative || false,
              collaborators: fullProduct?.collaborators || [],
            } as Product
          })
        setSemanticResults(dedupeById(enrichedResults))
      } catch {
        setSemanticResults([])
        setSearchMeta(null)
      } finally {
        setIsSearching(false)
        setSemanticResolved(true)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [isSemanticSearchActive, searchTerm, products, dedupeById])

  // Infinite scroll: fetch next page from API when inView
  useEffect(() => {
    if (isSemanticSearchActive) return;
    if (!hasMore || loadingMore) return;
    if (inView) {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const lang = currentLanguage || i18n.language || 'en'
      const qs = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PRODUCTS_PER_PAGE),
        lang,
      })
      if (selectedCategory) qs.set('category', selectedCategory)
      if (showCollaborativeOnly) qs.set('collaborativeOnly', 'true')
      if (showVirtualOnly) qs.set('virtualOnly', 'true')
      fetch(`/api/marketplace/products?${qs.toString()}`)
        .then(res => res.json())
        .then(json => {
          const newProducts = json.products || [];
          setProducts(prev => dedupeById([...prev, ...newProducts]));
          setCurrentPage(nextPage);
          if (typeof json.total === 'number') setTotalProducts(json.total)
          // If less than page size returned, no more data
          if (!json.products || json.products.length < PRODUCTS_PER_PAGE) {
            setHasMore(false);
          }
        })
        .catch(() => setHasMore(false))
        .finally(() => setLoadingMore(false));
    }
  }, [
    inView,
    hasMore,
    loadingMore,
    currentPage,
    currentLanguage,
    i18n.language,
    searchTerm,
    selectedCategory,
    showCollaborativeOnly,
    showVirtualOnly,
    dedupeById,
    isSemanticSearchActive,
  ]);

  // Reset pagination when filters/search change (server will refetch page 1 via SWR key)
  useEffect(() => {
    if (isSemanticSearchActive) {
      setHasMore(false)
      setCurrentPage(1)
      setLoadingMore(false)
      return
    }
    setCurrentPage(1);
    setHasMore(true);
    setLoadingMore(false)
  }, [searchTerm, selectedCategory, showCollaborativeOnly, showVirtualOnly, isSemanticSearchActive]);



  // Use semantic results while searching; otherwise use server-filtered paginated products.
  const paginatedProducts = useMemo(() => {
    if (!isSemanticSearchActive) return products
    // Keep current products visible until semantic search returns for this query.
    if (!semanticResolved) return products
    let list = semanticResults
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory)
    if (showCollaborativeOnly) list = list.filter((p) => p.isCollaborative)
    if (showVirtualOnly) list = list.filter((p) => p.is_virtual === true)
    return list
  }, [isSemanticSearchActive, semanticResolved, products, semanticResults, selectedCategory, showCollaborativeOnly, showVirtualOnly]);

  // Determine positions for inline recommendation rows
  const recommendationInsertIndices = useMemo(() => {
    // Show after every 12 items (3 full rows of 4)
    const indices: number[] = [];
    if (user && recommended.length > 0) {
      for (let i = 12; i < paginatedProducts.length; i += 12) {
        indices.push(i);
      }
    }
    return indices;
  }, [user, recommended, paginatedProducts.length]);

  // AR modal state
  const [arOpen, setArOpen] = useState(false)
  const [arImageUrl, setArImageUrl] = useState<string | undefined>(undefined)
  const [arProductType, setArProductType] = useState<'vertical' | 'horizontal'>('vertical')

  // Fetch recommendations for logged-in user
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) {
        setRecommended([]);
        return;
      }
      try {
        setRecLoading(true);
        const lang = currentLanguage || i18n.language || 'en';
        const res = await fetch(`/api/recommendations?userId=${user.id}&lang=${encodeURIComponent(lang)}`);
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        const json = await res.json();
        setRecommended(json.products || []);
      } catch (err) {
        setRecommended([]);
      } finally {
        setRecLoading(false);
      }
    };
    fetchRecommendations();
  }, [user, currentLanguage]);

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [wishlistLoading, setWishlistLoading] = useState(false)

  // Fetch wishlist on mount
  useEffect(() => {
    if (profile?.wishlist) {
      setWishlistIds(new Set(profile.wishlist))
    }
  }, [profile])

  const toggleWishlist = async (productId: string) => {
    if (!user || !profile) {
      alert(t('common.loginRequired'))
      return
    }

    // Optimistic update
    const isLiked = wishlistIds.has(productId)
    const newWishlist = new Set(wishlistIds)
    if (isLiked) {
      newWishlist.delete(productId)
    } else {
      newWishlist.add(productId)
    }
    setWishlistIds(newWishlist)

    try {
      const updatedWishlist = Array.from(newWishlist)
      const { error } = await supabase
        .from('profiles')
        .update({ wishlist: updatedWishlist })
        .eq('id', user.id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating wishlist:', JSON.stringify(error, null, 2))
      // Revert on error
      setWishlistIds(wishlistIds)
      alert('Error updating wishlist. Please try again.')
    }
  }

  // Speech recognition for search input
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Map app language to BCP-47
  const getSpeechLang = () => {
    const lang = currentLanguage || i18n.language || 'en'
    // Map app language to BCP-47 code (all names and short codes)
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      assamese: 'as-IN',
      bengali: 'bn-IN',
      bodo: 'brx-IN',
      dogri: 'doi-IN',
      gujarati: 'gu-IN',
      kannad: 'kn-IN',
      kashmiri: 'ks-IN',
      konkani: 'kok-IN',
      maithili: 'mai-IN',
      malyalam: 'ml-IN',
      manipuri: 'mni-IN',
      marathi: 'mr-IN',
      nepali: 'ne-NP',
      oriya: 'or-IN',
      punjabi: 'pa-IN',
      sanskrit: 'sa-IN',
      santhali: 'sat-IN',
      sindhi: 'sd-IN',
      tamil: 'ta-IN',
      telgu: 'te-IN',
      urdu: 'ur-IN',
      // Short codes
      as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
    }
    return langMap[lang] || lang
  }

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    let SpeechRecognitionCtor: typeof SpeechRecognition | undefined = undefined
    if (typeof window !== 'undefined') {
      SpeechRecognitionCtor = (window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition) as typeof SpeechRecognition | undefined
    }
    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = getSpeechLang()
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length > 0) {
        const transcript = event.results[0][0].transcript
        setSearchTerm(transcript)
      }
      setIsListening(false)
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  // Only fetch products when searchParams changes, not on translation change
  useEffect(() => {
    // Handle Google session from OAuth callback
    const googleSession = searchParams.get('google_session')
    if (googleSession) {
      try {
        const googleUser = JSON.parse(decodeURIComponent(googleSession))
        localStorage.setItem('googleUserSession', JSON.stringify(googleUser))
        console.log('Google session stored:', googleUser)
        // Reload the page to trigger auth context update
        window.location.href = window.location.pathname
        return
      } catch (error) {
        console.error('Error parsing Google session:', error)
      }
    }

    // Handle Microsoft session from OAuth callback
    const microsoftSession = searchParams.get('microsoft_session')
    if (microsoftSession) {
      try {
        const microsoftUser = JSON.parse(decodeURIComponent(microsoftSession))
        localStorage.setItem('microsoftUserSession', JSON.stringify(microsoftUser))
        console.log('Microsoft session stored:', microsoftUser)
        // Reload the page to trigger auth context update
        window.location.href = window.location.pathname
        return
      } catch (error) {
        console.error('Error parsing Microsoft session:', error)
      }
    }
  }, [searchParams])

  // Remove debounced search effect for filterProducts, now handled by useMemo

  // Remove effect for filterProducts, now handled by useMemo

  // Handle search input change with immediate reset for empty search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Improved security: sanitize search term by removing potentially dangerous characters and trimming
    const sanitizedValue = value.replace(/[<>{}()]/g, '').slice(0, 100)
    setSearchTerm(sanitizedValue)
    
    if (sanitizedValue.trim().length > 1) {
       setShowAutocomplete(true);
       const res = fuse.search(sanitizedValue);
       const exactMatches = popularKeywords.filter(k => k.includes(sanitizedValue.toLowerCase()));
       // Combine fuzzy matches and exact subset matches
       const combined = Array.from(new Set([...exactMatches, ...res.map(r => r.item.word)]));
       setSuggestions(combined.slice(0, 4));
    } else {
       setShowAutocomplete(false);
       setSuggestions([]);
    }
  }

  // Remove clientSideFilter, now handled by useMemo
  // No need to translate products/categories/sellers on frontend anymore
  useEffect(() => {
    setDisplayProducts(products)
    setDisplayCategories(categories)
    setTranslatedSellerNames({})
  }, [products, categories])

  // No need to translate recommended list on frontend anymore
  useEffect(() => {
    setDisplayRecommended(recommended)
  }, [recommended])


  // Debounced search logging
  useEffect(() => {
    if (!user) return
    if (!searchTerm) return
    if (searchLogTimer) clearTimeout(searchLogTimer)
    const t = setTimeout(() => {
      logActivity({ userId: user.id, activityType: 'search', query: searchTerm })
    }, 800)
    setSearchLogTimer(t)
    return () => clearTimeout(t)
  }, [user, searchTerm])

  // Fetch recommendations (client-side to leverage user session for RLS)
  // (No direct Supabase product fetching for main grid)

  // Cart feedback state
  const [cartStatus, setCartStatus] = useState<'success' | 'error' | null>(null);
  const [cartMessage, setCartMessage] = useState('');
  const [cartModalOpen, setCartModalOpen] = useState(false);

  const addToCart = async (productId: string) => {
    try {
      if (!user) {
        // Add to localStorage for anonymous users
        const { addToAnonymousCart } = await import('@/utils/cart')
        addToAnonymousCart(productId, 1)
        setCartStatus('success');
        setCartMessage(t('cart.addedSuccess'));

        // Dispatch custom event to immediately update cart count in navbar
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        setCartModalOpen(true);
        return;
      }

      // For logged-in users, add to database
      // Check if item already exists in cart
      const { data: existing, error: fetchError } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', productId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116: No rows found
        throw fetchError;
      }

      let res;
      if (existing) {
        // Update quantity
        res = await supabase
          .from('cart')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      } else {
        // Insert new cart item
        res = await supabase
          .from('cart')
          .insert({
            buyer_id: user.id,
            product_id: productId,
            quantity: 1,
          });
      }
      if (res.error) throw res.error;
      setCartStatus('success');
      setCartMessage(t('cart.addedSuccess'));

      // Dispatch custom event to immediately update cart count in navbar
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add to cart error:', err);
      setCartStatus('error');
      setCartMessage(t('cart.addedError'));
    }
    setCartModalOpen(true);
  }

  const showInitialSkeleton = !swrData && swrLoading

  if (showInitialSkeleton) {
    // Show a grid of skeleton cards matching the product grid
    return (
      <div className="min-h-screen heritage-bg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div>
                <div className="h-10 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen heritage-bg py-8">
      {/* Cart Modal */}
      {cartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full relative flex flex-col items-center">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setCartModalOpen(false)}>&times;</button>
            {cartStatus === 'success' ? (
              <>
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">{t('cart.addedSuccessTitle') || 'Added to Cart!'}</h2>
                <p className="text-gray-700 mb-6">{cartMessage}</p>
                <Link href="/cart" className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-lg hover:shadow-xl text-center">{t('cart.viewCart')}</Link>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">{t('cart.addedErrorTitle') || 'Could not add to Cart'}</h2>
                <p className="text-gray-700 mb-6">{cartMessage}</p>
                <button onClick={() => setCartModalOpen(false)} className="w-full px-6 py-3 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 font-semibold rounded-xl hover:from-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200 shadow-lg hover:shadow-xl">{t('cart.close')}</button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Onboarding tour will be integrated with Intro.js here */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <h1 className="text-4xl font-bold heritage-title mb-1">
                {t('marketplace.title')}
              </h1>
              <p className="text-lg text-[var(--heritage-brown)]">
                {t('marketplace.subtitle')}
              </p>
            </div>
            <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-center md:justify-end">
              <Market3DButton
                products={paginatedProducts.map(p => ({
                  ...p,
                  name: typeof p.title === 'string' ? p.title : '',
                  price: p.price,
                  image_url: p.image_url,
                  description: p.description,
                  category: p.category as ThreeProduct['category'],
                  additional_images: p.additional_images || undefined,
                }))}
                onAddToCart={addToCart}
                onViewDetails={(id) => {
                  // Reuse navigation to product detail
                  window.location.href = `/product/${id}`
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="heritage-card p-6 mb-8 border border-heritage-gold/40"
        >
          {/* AI Helper Text */}
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-600">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>{t('marketplace.aiHelperText')}</span>
            <span className="text-gray-400">{t('marketplace.aiHelperHint')}</span>
          </div>



          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
              <input
                type="text"
                placeholder={t('marketplace.searchInputPlaceholder')}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-14 py-3 border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent placeholder-[var(--muted)]"
                aria-label={t('marketplace.searchInputPlaceholder')}
              />
              {/* Mic icon for speech input */}
              <button
                type="button"
                onClick={handleMicClick}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 bg-[var(--bg-2)] p-2 rounded-full border border-[var(--border)] shadow-sm hover:bg-[var(--bg-3)] focus:outline-none focus:ring-2 focus:ring-[var(--heritage-gold)] transition-colors ${isListening ? 'text-orange-600' : 'text-[var(--muted)]'}`}
                title={isListening ? t('marketplace.listening') : t('marketplace.speakToSearch')}
                aria-label={t('marketplace.speakToSearch')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v3m0 0h-3m3 0h3m-3-3a6 6 0 006-6V9a6 6 0 10-12 0v3a6 6 0 006 6z" />
                </svg>
              </button>
              {(swrValidating || isSearching) && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                </div>
              )}

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {showAutocomplete && suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-[var(--bg-1)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
                  >
                    <ul>
                      {suggestions.map((sug, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              setSearchTerm(sug);
                              setShowAutocomplete(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-2)] transition-colors flex items-center gap-3 text-[var(--text)]"
                          >
                            <Search className="w-4 h-4 text-[var(--muted)]" />
                            <span>{sug}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent appearance-none"
              >
                <option value="">{t('marketplace.allCategories')}</option>
                {/* Map display labels with original values for filtering */}
                {displayCategories.map((label, idx) => (
                  <option key={`${label}-${idx}`} value={categories[idx] || label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Gifting & Collaborative Button Row */}
          <div className="mb-4 mt-4 flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              type="button"
              aria-label={t('marketplace.giftableProducts')}
              className={`px-4 py-2 rounded-lg font-medium transition-transform duration-200 ease-out transform will-change-transform flex items-center gap-2 shadow-sm hover:-translate-y-3.5 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200  ${searchTerm === 'gift item'
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md border-yellow-500'
                : 'bg-[var(--bg-2)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg-3)]'}
              `}
              onClick={() => setSearchTerm(searchTerm === 'gift item' ? '' : 'gift item')}
            >
              🎁 {t('marketplace.giftableProducts')}
            </button>
            <button
              onClick={() => setShowCollaborativeOnly(!showCollaborativeOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition-transform duration-200 ease-out transform will-change-transform flex items-center gap-2 shadow-sm hover:-translate-y-3.5 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200 ${showCollaborativeOnly
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md border-yellow-500'
                : 'bg-[var(--bg-2)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg-3)]'
                }`}
              aria-pressed={showCollaborativeOnly}
            >
              {showCollaborativeOnly ? t('marketplace.showingCollaborativeOnly') : t('marketplace.showCollaborativeProducts')}
            </button>
            <button
              onClick={() => setShowVirtualOnly(!showVirtualOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition-transform duration-200 ease-out transform will-change-transform flex items-center gap-2 shadow-sm hover:-translate-y-3.5 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-200 ${showVirtualOnly
                ? 'bg-gradient-to-r from-cyan-400 to-teal-500 text-white shadow-md border-cyan-500'
                : 'bg-[var(--bg-2)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg-3)]'
                }`}
              aria-pressed={showVirtualOnly}
            >
              {showVirtualOnly ? t('marketplace.showingVirtualOnly') : t('marketplace.showVirtualProducts')}
            </button>
          </div>
        </motion.div>



        {/* Products Grid */}
        <ErrorBoundary fallback={
          <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-red-200">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text)]">{t('errors.general')}</h2>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              {t('common.refresh')}
            </button>
          </div>
        }>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Search Feedback Metadata */}
            {searchMeta && (
              <div className="mb-6 space-y-3">
                {searchMeta.correctedQuery && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-600" />
                    <p>Showing results for <span className="font-bold">{searchMeta.correctedQuery}</span> instead of <span className="line-through opacity-70">{searchMeta.originalQuery}</span></p>
                  </div>
                )}
                {searchMeta.isFallback && paginatedProducts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                    <p>We couldn't find exactly what you were looking for, but here are some related popular items!</p>
                  </div>
                )}
              </div>
            )}

            {paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[var(--muted)] text-lg">{t('marketplace.noProducts')}</p>
                <p className="text-gray-400">{t('marketplace.noProductsDescription')}</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedProducts.map((product, index) => {
                    // Insert carousel after every 12 products (3 rows of 4), but ensure unique keys for all children
                    const children = [];
                    children.push(
                      <ProductCard
                        key={`product-${product.id}`}
                        product={product}
                        displayProduct={displayProducts.find(p => p.id === product.id) || product}
                        translatedSellerNames={translatedSellerNames}
                        narratingId={narratingId}
                        wishlistIds={wishlistIds}
                        onAddToCart={addToCart}
                        onToggleWishlist={toggleWishlist}
                        onNarrate={handleNarrate}
                        onStopNarrate={handleStopNarrate}
                        onAR={(imageUrl, productType) => {
                          setArImageUrl(imageUrl);
                          setArProductType(productType || 'vertical');
                          setArOpen(true);
                        }}
                      />
                    );
                    if ((index + 1) % 12 === 0 && (index + 1) < paginatedProducts.length && user && displayRecommended.length > 0) {
                      children.push(
                        <div key={`carousel-${index + 1}`} className="col-span-full py-6 md:py-8 border-y border-heritage-gold/20 my-4 bg-[var(--bg-2)]/50 backdrop-blur-sm rounded-2xl px-3 md:px-8 overflow-hidden">
                          <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-[var(--text)]">
                              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                              <span className="line-clamp-1">{t('marketplace.becauseViewedSimilar')}</span>
                            </h2>
                            <Link href="/recommendations" className="text-xs md:text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap">
                              {t('common.viewAll')} →
                            </Link>
                          </div>
                          <style jsx global>{`
                            .recommended-carousel .swiper-button-next,
                            .recommended-carousel .swiper-button-prev {
                              color: var(--heritage-gold);
                              background: var(--bg-1);
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                              border: 1px solid var(--border);
                              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            }
                            @media (max-width: 640px) {
                              .recommended-carousel .swiper-button-next,
                              .recommended-carousel .swiper-button-prev {
                                display: none;
                              }
                            }
                            .recommended-carousel .swiper-button-next:after,
                            .recommended-carousel .swiper-button-prev:after {
                              font-size: 12px;
                              font-weight: bold;
                            }
                            .recommended-carousel .swiper-pagination-bullet {
                              background: var(--muted);
                              opacity: 0.5;
                            }
                            .recommended-carousel .swiper-pagination-bullet-active {
                              background: var(--heritage-gold);
                              opacity: 1;
                            }
                            .recommended-carousel.swiper {
                              padding-bottom: 50px !important;
                            }
                          `}</style>
                          <Swiper
                            modules={[Navigation, Pagination, Autoplay]}
                            spaceBetween={16}
                            slidesPerView={1.2}
                            navigation
                            pagination={{ clickable: true }}
                            breakpoints={{
                              480: { slidesPerView: 1.5, spaceBetween: 20 },
                              640: { slidesPerView: 2, spaceBetween: 24 },
                              1024: { slidesPerView: 3, spaceBetween: 24 },
                              1280: { slidesPerView: 4, spaceBetween: 24 }
                            }}
                            className="recommended-carousel"
                          >
                            {displayRecommended.map((rp) => (
                              <SwiperSlide key={`rec-${rp.id}`}>
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all h-full"
                                >
                                  <Link href={`/product/${rp.id}`}>
                                    <div className="h-40 bg-[var(--bg-3)] relative overflow-hidden">
                                      {rp.image_url ? (
                                        <img
                                          src={rp.image_url}
                                          alt={rp.title}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-3)]">
                                          <span className="text-4xl text-[var(--muted)]">🎨</span>
                                        </div>
                                      )}
                                      <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--card)]/90 backdrop-blur rounded text-xs font-bold text-orange-600 border border-[var(--border)] shadow-sm">
                                        ₹{rp.price}
                                      </div>
                                    </div>
                                    <div className="p-3">
                                      <h3 className="font-semibold text-sm text-[var(--text)] line-clamp-1 mb-1">
                                        {rp.title}
                                      </h3>
                                      <p className="text-xs text-[var(--muted)] mb-2">{rp.category}</p>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          addToCart(rp.id);
                                        }}
                                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors"
                                      >
                                        {t('product.addToCart')}
                                      </button>
                                    </div>
                                  </Link>
                                </motion.div>
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        </div>
                      );
                    }
                    return children;
                  })}
                </div>

                {/* Load More Trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-12 flex justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                      <p className="text-sm text-[var(--muted)]">{t('common.loadingMore') || 'Discovering more treasures...'}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </ErrorBoundary>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-center text-[var(--muted)]"
        >
          {t('marketplace.resultsCount', { count: paginatedProducts.length, total: totalProducts || dedupeById(products).length })}
        </motion.div>
      </div>

      {/* ARViewer Modal */}
      <ARViewer open={arOpen} onClose={() => setArOpen(false)} imageUrl={arImageUrl} productType={arProductType} />
    </div>
  )
}
