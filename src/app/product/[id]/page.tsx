'use client'
import { useRef } from 'react'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import { ShoppingCart, Heart, ArrowLeft, Star, User, Sparkles } from 'lucide-react'
import GroupGiftModal from '@/components/GroupGiftModal'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateText } from '@/lib/translate'
import dynamic from 'next/dynamic'

const AuctionWidget = dynamic(() => import('@/components/AuctionWidget'), { ssr: false })
const ARViewer = dynamic(() => import('@/components/ARViewer'), { ssr: false })

type Product = Database['public']['Tables']['products']['Row'] & {
  seller: {
    name: string
    bio: string | null
    profile_image: string | null
    store_description: string | null
  }
  isCollaborative?: boolean
  collaborators?: {
    id: string
    name: string
    bio: string | null
    profile_image: string | null
    store_description: string | null
  }[]
}

type CollabJoin = {
  product_id?: string
  collaboration?: {
    id: string
    initiator_id: string
    partner_id: string
    status: string
    initiator?: { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string }[] | { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string } | null
    partner?: { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string }[] | { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string } | null
  } | ({
    id: string
    initiator_id: string
    partner_id: string
    status: string
    initiator?: { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string }[] | null
    partner?: { id: string; name?: string; bio?: string; profile_image?: string; store_description?: string }[] | null
  }[]) | null
}

type RecipientProfile = {
  id: string;
  name: string;
  email: string;
  profile_image: string | null;
};

export default function ProductDetail() {
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartModalStatus, setCartModalStatus] = useState<'success' | 'error' | null>(null);
  const [cartModalMessage, setCartModalMessage] = useState<string>('');
  // Debug: log language mapping for translation on every render
  const langMap: Record<string, string> = {
    en: 'en',
    hi: 'hi',
    assamese: 'as',
    bengali: 'bn',
    bodo: 'brx',
    dogri: 'doi',
    gujarati: 'gu',
    kannada: 'kn', kannad: 'kn',
    kashmiri: 'ks',
    konkani: 'gom',
    maithili: 'mai',
    malayalam: 'ml', malyalam: 'ml',
    manipuri: 'mni-Mtei',
    marathi: 'mr',
    nepali: 'ne',
    oriya: 'or',
    punjabi: 'pa',
    sanskrit: 'sa',
    santhali: 'sat',
    sindhi: 'sd',
    tamil: 'ta',
    telugu: 'te', telgu: 'te',
    urdu: 'ur',
  };
  const lang = langMap[typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') || '' : ''] || '';
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[ProductDetail] Translating with language code:', lang, 'for app language:', window.localStorage.getItem('i18nextLng'));
  }
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);



  const [isNarrating, setIsNarrating] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [translatedStory, setTranslatedStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [hasActiveAuction, setHasActiveAuction] = useState(false)
  const [arOpen, setArOpen] = useState(false)

  useEffect(() => {
    if (product?.category) {
      // Fetch related products based on category
      const fetchRelated = async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('category', product.category)
          .neq('id', product.id)
          .limit(4);
        if (data) setRelatedProducts(data as Product[]);
      };
      fetchRelated();
    }
  }, [product]);
  const [arImageUrl, setArImageUrl] = useState('')
  const [arProductType, setArProductType] = useState<'vertical' | 'horizontal'>('vertical')
  // Gift Modal State
  const [giftModalOpen, setGiftModalOpen] = useState(false)
  const [giftType, setGiftType] = useState<'individual' | 'group'>('individual')
  const [groupGiftModalOpen, setGroupGiftModalOpen] = useState(false)
  const [giftRecipient, setGiftRecipient] = useState("")
  const [giftMessage, setGiftMessage] = useState("")
  const [gifting, setGifting] = useState(false)
  const [giftSuccess, setGiftSuccess] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null);
  // Custom Request Modal State
  const [customRequestModalOpen, setCustomRequestModalOpen] = useState(false);
  const [customRequestMessage, setCustomRequestMessage] = useState("");
  const [customRequestLoading, setCustomRequestLoading] = useState(false);
  const [customRequestSuccess, setCustomRequestSuccess] = useState(false);
  const [customRequestError, setCustomRequestError] = useState<string | null>(null);
  // Recipient search state for realtime search
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<RecipientProfile[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientProfile | null>(null);
  // Debounce for recipient search
  useEffect(() => {
    if (!recipientQuery || recipientQuery.length <= 1) {
      setRecipientResults([])
      setRecipientLoading(false)
      return
    }
    setRecipientLoading(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, profile_image')
        .or(`name.ilike.%${recipientQuery}%,email.ilike.%${recipientQuery}%`)
        .neq('id', user?.id || '')
        .limit(5)
      setRecipientResults(data || [])
      setRecipientLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [recipientQuery, user])

  // Update handleSendGift for API POST
  const handleSendGift = async () => {
    setGifting(true);
    setGiftError(null);
    try {
      if (!selectedRecipient) {
        setGiftError('Please select a recipient.');
        setGifting(false);
        return;
      }
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product?.id,
          recipient_id: selectedRecipient.id,
          message: giftMessage,
          user_id: profile?.id
        }),
      });
      const json = await res.json();
      console.log('Gift API response:', json);
      if (!res.ok) {
        setGiftError(json?.error || 'Gift could not be sent.');
        setGifting(false);
        return;
      }
      console.log('Gift sent successfully!');
      setGiftSuccess(true);
      setGiftMessage("");
      setRecipientQuery("");
      setSelectedRecipient(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGiftError(err.message);
      } else {
        setGiftError('Could not send gift – try again later.');
      }
    }
    setGifting(false);
  }


  useEffect(() => {
    // Debug: log language mapping for translation on every language switch
    const langMap: Record<string, string> = {
      en: 'en',
      hi: 'hi',
      assamese: 'as',
      bengali: 'bn',
      bodo: 'brx',
      dogri: 'doi',
      gujarati: 'gu',
      kannada: 'kn', kannad: 'kn',
      kashmiri: 'ks',
      konkani: 'gom',
      maithili: 'mai',
      malayalam: 'ml', malyalam: 'ml',
      manipuri: 'mni-Mtei',
      marathi: 'mr',
      nepali: 'ne',
      oriya: 'or',
      punjabi: 'pa',
      sanskrit: 'sa',
      santhali: 'sat',
      sindhi: 'sd',
      tamil: 'ta',
      telugu: 'te', telgu: 'te',
      urdu: 'ur',
    };
    const lang = langMap[currentLanguage] || currentLanguage;
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[ProductDetail] Translating with language code:', lang, 'for app language:', currentLanguage);
    }
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id, currentLanguage])

  useEffect(() => {
    if (user && product?.id) {
      logActivity({ userId: user.id, activityType: 'view', productId: product.id })
    }
  }, [user, product?.id])

  const fetchProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(name, bio, profile_image, store_description)
        `)
        .eq('id', productId)
        .single()

      if (error) throw error

      // Check if this is a collaborative product
      const { data: collabData } = await supabase
        .from('collaborative_products')
        .select(`
          product_id,
          collaboration:collaborations(
            id,
            initiator_id,
            partner_id,
            status,
            initiator:profiles!collaborations_initiator_id_fkey(id, name, bio, profile_image, store_description),
            partner:profiles!collaborations_partner_id_fkey(id, name, bio, profile_image, store_description)
          )
        `)
        .eq('product_id', productId)
        .eq('collaboration.status', 'accepted')
        .single()


      // Map app language keys to Google Translate codes
      const langMap: Record<string, string> = {
        en: 'en',
        hi: 'hi',
        assamese: 'as',
        bengali: 'bn',
        bodo: 'brx',
        dogri: 'doi',
        gujarati: 'gu',
        kannada: 'kn', kannad: 'kn',
        kashmiri: 'ks',
        konkani: 'gom',
        maithili: 'mai',
        malayalam: 'ml', malyalam: 'ml',
        manipuri: 'mni-Mtei',
        marathi: 'mr',
        nepali: 'ne',
        oriya: 'or',
        punjabi: 'pa',
        sanskrit: 'sa',
        santhali: 'sat',
        sindhi: 'sd',
        tamil: 'ta',
        telugu: 'te', telgu: 'te',
        urdu: 'ur',
      };
      const lang = langMap[currentLanguage] || currentLanguage;
      // Debug: log language mapping for translation
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.log('[ProductDetail] Translating with language code:', lang, 'for app language:', currentLanguage);
      }
      const translated = { ...data }
      translated.title = await translateText(data.title || '', lang)
      translated.category = await translateText(data.category || '', lang)
      translated.description = await translateText(data.description || '', lang)
      if (translated.seller) {
        translated.seller = { ...translated.seller }
        translated.seller.name = await translateText(data.seller?.name || '', lang)
        translated.seller.bio = await translateText(data.seller?.bio || '', lang)
        translated.seller.store_description = await translateText(data.seller?.store_description || '', lang)
      }

      // Translate product story for UI display
      let translatedStory: string | null = null;
      if (data.product_story) {
        try {
          translatedStory = await translateText(data.product_story, lang);
        } catch (e) {
          translatedStory = data.product_story;
        }
      }
      setTranslatedStory(translatedStory);

      // Add collaboration info if exists
      if (collabData?.collaboration) {
        const raw = collabData as unknown as CollabJoin
        let collab = raw.collaboration
        if (Array.isArray(collab)) collab = collab[0]
        if (collab) {
          // Helper to normalize value which may be an array or a single object
          const getFirst = <T,>(val?: T[] | T | null): T | null => {
            if (!val) return null
            return Array.isArray(val) ? val[0] : (val as T)
          }

          const initiator = getFirst(collab.initiator)
          const partner = getFirst(collab.partner)

          const collaborators = [
            {
              id: collab.initiator_id,
              name: await translateText(initiator?.name || '', lang),
              bio: await translateText(initiator?.bio || '', lang),
              profile_image: initiator?.profile_image || null,
              store_description: await translateText(initiator?.store_description || '', lang)
            },
            {
              id: collab.partner_id,
              name: await translateText(partner?.name || '', lang),
              bio: await translateText(partner?.bio || '', lang),
              profile_image: partner?.profile_image || null,
              store_description: await translateText(partner?.store_description || '', lang)
            }
          ]
          translated.isCollaborative = true
          translated.collaborators = collaborators
        }
      }

      setProduct(translated as Product)
      // check if product has an active auction
      try {
        const { data: a } = await supabase.from('auctions').select('*').eq('product_id', productId).in('status', ['scheduled', 'running']).limit(1)
        setHasActiveAuction((a && a.length > 0) || false)
      } catch (err) {
        setHasActiveAuction(false)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching product:', error)
      setLoading(false)
    }
  }

  const addToCart = async () => {
    if (!product) {
      setCartModalStatus('error');
      setCartModalMessage(t('cart.addedError'));
      setCartModalOpen(true);
      return;
    }

    try {
      if (!user) {
        // Add to localStorage for anonymous users
        const { addToAnonymousCart } = await import('@/utils/cart')
        addToAnonymousCart(product.id, quantity)
        setCartModalStatus('success');
        setCartModalMessage(t('cart.addedSuccess'));
        
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
        .eq('product_id', product.id)
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
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
      } else {
        // Insert new cart item
        res = await supabase
          .from('cart')
          .insert({
            buyer_id: user.id,
            product_id: product.id,
            quantity,
          });
      }
      if (res.error) throw res.error;
      setCartModalStatus('success');
      setCartModalMessage(t('cart.addedSuccess'));
      
      // Dispatch custom event to immediately update cart count in navbar
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add to cart error:', err);
      setCartModalStatus('error');
      setCartModalMessage(t('cart.addedError'));
    }
    setCartModalOpen(true);
  }

  // Accordion Item Component
  const AccordionItem = ({ title, content }: { title: string, content: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border-b border-gray-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-4 flex items-center justify-between text-left group"
        >
          <span className="font-serif text-lg text-gray-900 group-hover:text-orange-700 transition-colors">{title}</span>
          <span className={`text-2xl font-light text-orange-400 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
        </button>
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div className="pb-4 text-gray-600 leading-relaxed">
            {content}
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full"
        />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{t('product.notFound')}</p>
          <Link
            href="/marketplace"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            {t('marketplace.backToMarketplace')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-1)] py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Navigation Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-8 space-x-2">
          <Link href="/marketplace" className="hover:text-orange-600 transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 mb-20">

          {/* Left Column: Image Gallery (Balanced) */}
          <div className="space-y-4 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-[4/5] w-full max-w-sm mx-auto bg-gray-50 rounded-lg overflow-hidden border border-gray-100 group"
            >
              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {product.isCollaborative && (
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border border-amber-200">
                    🤝 Collaborative
                  </span>
                )}
                {product.is_virtual && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border border-blue-200">
                    🧩 Virtual Asset
                  </span>
                )}
              </div>

              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  className="object-cover object-center"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-6xl text-gray-300">🖼️</span>
                </div>
              )}

              {/* AR Trigger */}
              <button
                onClick={() => {
                  setArImageUrl(product.image_url || '')
                  setArProductType((product.product_type as 'vertical' | 'horizontal') || 'vertical')
                  setArOpen(true)
                }}
                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-gray-900 p-3 rounded-full shadow-lg hover:bg-orange-50 hover:text-orange-600 transition-all z-20"
                title="View in AR"
              >
                <div className="relative">
                  <span className="text-xl">📱</span>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                </div>
              </button>
            </motion.div>

            {/* Thumbnails (Mockup since DB only has 1 image usually) */}

            {/* Product Story (Heritage Redesign - Moved to Left Column) */}
            {product.product_story && (
              <div className="relative mt-8 group perspective-1000">
                {/* Background Parchment Effect */}
                <div className="absolute inset-0 bg-[#fdfbf7] [:root[data-theme=dark]_&]:bg-gray-900 rounded-xl shadow-[inset_0_0_40px_rgba(176,141,85,0.1)] border border-[#e6dcc5] [:root[data-theme=dark]_&]:border-gray-700 transform transition-transform duration-700 group-hover:rotate-x-2"></div>

                {/* Content */}
                <div className="relative p-8 text-center space-y-4">
                  {/* Decorative Header */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#b08d55]"></div>
                    <Sparkles className="w-6 h-6 text-[#b08d55]" />
                    <h3 className="font-serif text-2xl text-[#3d0000] [:root[data-theme=dark]_&]:text-orange-100 tracking-wide">
                      Artisan&apos;s Story
                    </h3>
                    <Sparkles className="w-6 h-6 text-[#b08d55]" />
                    <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#b08d55]"></div>
                  </div>

                  {/* Drop Cap Story */}
                  <div className="prose prose-lg text-gray-700 [:root[data-theme=dark]_&]:text-gray-300 mx-auto font-serif leading-relaxed">
                    <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-[#b08d55] first-letter:mr-3 first-letter:float-left">
                      {product.product_story}
                    </p>
                  </div>

                  {/* Audio Narration Button */}
                  <div className="flex justify-center mt-2 mb-4">
                    {!isNarrating ? (
                      <button
                        onClick={async () => {
                          const langMap: Record<string, string> = {
                            en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', urdu: 'ur-IN', as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
                          };
                          const lang = langMap[currentLanguage] || 'en-IN';
                          let storyText = product.product_story ?? '';
                          try {
                            storyText = await translateText(storyText, currentLanguage);
                          } catch (_) {
                            // fallback
                          }
                          const utter = new SpeechSynthesisUtterance(storyText);
                          utter.lang = lang;
                          const voices = window.speechSynthesis.getVoices();
                          const matchVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0])) || voices.find(v => v.lang && v.lang.startsWith('en'));
                          if (matchVoice) utter.voice = matchVoice;
                          utter.rate = 1;
                          utter.pitch = 1;
                          utterRef.current = utter;
                          window.speechSynthesis.speak(utter);
                          setIsNarrating(true);
                          utter.onend = () => setIsNarrating(false);
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-[#b08d55] text-white rounded-full font-serif font-bold text-sm hover:bg-[#8c6b30] transition-colors shadow-sm hover:shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        Listen
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          setIsNarrating(false);
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-[#8c6b30] text-white rounded-full font-serif font-bold text-sm animate-pulse"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        Stop
                      </button>
                    )}
                  </div>

                  {/* Footer Ornament */}
                  <div className="pt-4 flex justify-center opacity-50">
                    <svg width="100" height="20" viewBox="0 0 100 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 10C20 10 30 0 50 0C70 0 80 10 100 10V11C80 11 70 20 50 20C30 20 20 11 0 11V10Z" fill="#b08d55" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Product Info (Balanced) */}
          <div className="flex flex-col h-full">
            <div className="sticky top-24 space-y-8">

              {/* Header */}
              <div>
                <h1 className="text-4xl font-serif text-gray-900 mb-2 leading-tight">
                  {product.title}
                </h1>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    ₹{product.price}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-orange-400 fill-orange-400" />)}
                    <span className="text-sm text-gray-500 ml-1">(4.8)</span>
                  </div>
                </div>
              </div>

              {/* Main Actions (Moved Up) */}
              <div className="space-y-4 pt-4">
                {/* Quantity Selector */}
                <div className="flex items-center gap-4 bg-[var(--bg-2)] border border-[var(--border)] p-4 rounded-lg">
                  <span className="font-medium text-[var(--text)]">Qty:</span>
                  <div className="flex items-center border border-[var(--border)] rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
                    >
                      −
                    </button>
                    <span className="px-6 py-2 font-mono font-medium text-[var(--text)] border-x border-[var(--border)]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={addToCart}
                  disabled={hasActiveAuction}
                  className="w-full bg-gradient-to-r from-[#b08d55] to-[#8c6b30] hover:from-[#8c6b30] hover:to-[#6b4c1e] text-white py-3 rounded-lg font-bold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 border border-[#b08d55]/50 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {hasActiveAuction ? 'On Auction' : t('product.addToCart')}
                    {!hasActiveAuction && <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl pointer-events-none"></div>
                </button>
              </div>

              {/* Secondary Action Buttons (Moved Up) */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Gift Button */}
                <button
                  className="group relative flex-1 flex items-center justify-center px-4 py-2.5 bg-white border border-[#b08d55] text-[#b08d55] font-semibold rounded-lg transition-all duration-300 hover:bg-[#b08d55] hover:text-white hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#b08d55]/20"
                  title={t('product.giftButtonTooltip')}
                  onClick={() => setGiftModalOpen(true)}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <span role="img" aria-label="gift" className="text-lg group-hover:animate-bounce">🎁</span>
                    <span className="text-sm tracking-wide uppercase font-bold">{t('product.sendAsGift')}</span>
                  </div>
                </button>

                {/* Custom Request Button */}
                <button
                  className="group relative flex-1 flex items-center justify-center px-4 py-2.5 bg-[#3d0000] text-[#b08d55] font-semibold rounded-lg transition-all duration-300 hover:bg-[#590000] hover:text-[#d4af37] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#3d0000]/20 shadow-md hover:shadow-lg"
                  title={t('product.customRequestButtonTooltip')}
                  onClick={() => setCustomRequestModalOpen(true)}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm tracking-wide uppercase font-bold">{t('product.customRequest')}</span>
                  </div>
                </button>
              </div>

              <hr className="border-gray-100 my-2" />

              {/* Description */}
              <div className="prose prose-sm text-gray-600 leading-relaxed">
                <p>{product.description}</p>
                {/* Audio Story Prompt */}
                {product.product_story && !isNarrating && (
                  <button onClick={async () => {
                    // Using existing logic simplified for call
                    const langMap: Record<string, string> = {
                      en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', urdu: 'ur-IN', as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
                    };
                    const lang = langMap[currentLanguage] || currentLanguage || 'en-IN';
                    let storyText = product.product_story ?? '';
                    try {
                      storyText = await translateText(storyText, currentLanguage);
                    } catch (err) {
                      // fallback to original if translation fails
                    }
                    const utter = new SpeechSynthesisUtterance(storyText);
                    utter.lang = lang;
                    const voices = window.speechSynthesis.getVoices();
                    const matchVoice = voices.find(v => v.lang === lang) ||
                      voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0])) ||
                      voices.find(v => v.lang && v.lang.startsWith('en'));
                    if (matchVoice) utter.voice = matchVoice;
                    utter.rate = 1;
                    utter.pitch = 1;
                    utterRef.current = utter;
                    window.speechSynthesis.speak(utter);
                    setIsNarrating(true);
                    utter.onend = () => setIsNarrating(false);
                  }} className="text-orange-600 text-sm font-medium flex items-center gap-2 mt-2 hover:underline">
                    <Sparkles className="w-4 h-4" />
                    Listen to the Artisan&apos;s Story
                  </button>
                )}
                {isNarrating && (
                  <button onClick={() => { window.speechSynthesis.cancel(); setIsNarrating(false) }} className="text-red-500 text-sm font-medium flex items-center gap-2 mt-2">
                    Stop Narration
                  </button>
                )}
              </div>




              {/* Artisan Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 pt-8 border-t border-gray-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-1 h-8 bg-[#b08d55] rounded-full"></span>
                  <h3 className="text-xl font-serif text-[#3d0000] [:root[data-theme=dark]_&]:text-orange-100">
                    {product.isCollaborative
                      ? `🤝 ${t('product.meetCollaborativeArtisans')}`
                      : t('product.meetTheArtisan')
                    }
                  </h3>
                </div>

                {product.isCollaborative && product.collaborators ? (
                  // Show all collaborators (Professional Grid)
                  <div className="grid gap-4">
                    {product.collaborators.map((collaborator, index) => (
                      <div key={collaborator.id} className="group relative bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-[#b08d55]/30 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md ring-2 ring-[#b08d55]/20 group-hover:ring-[#b08d55] transition-all">
                              {collaborator.profile_image ? (
                                <Image
                                  src={collaborator.profile_image}
                                  alt={collaborator.name}
                                  width={64}
                                  height={64}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#fdfbf7] flex items-center justify-center text-[#b08d55]">
                                  <User className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            {index === 0 && (
                              <span className="absolute -bottom-1 -right-1 bg-[#b08d55] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-white">
                                Lead
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate group-hover:text-[#b08d55] transition-colors">{collaborator.name}</h4>
                            <p className="text-xs text-[#b08d55] font-medium uppercase tracking-wider mb-1">
                              {index === 0 ? "Master Artisan" : "Collaborator"}
                            </p>
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                              {collaborator.store_description || collaborator.bio || t('product.artisanBioFallback')}
                            </p>

                            <Link
                              href={`/stall/${collaborator.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#3d0000] [:root[data-theme=dark]_&]:text-orange-200 mt-2 hover:underline decoration-[#b08d55]"
                            >
                              Visit Stall <ArrowLeft className="w-3 h-3 rotate-180" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show single seller (Professional Card)
                  <div className="group relative bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-[#b08d55]/30 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className="relative w-20 h-20 shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white [:root[data-theme=dark]_&]:border-gray-600 shadow-lg ring-1 ring-gray-100 [:root[data-theme=dark]_&]:ring-gray-700 group-hover:ring-[#b08d55] transition-all">
                          {product.seller?.profile_image ? (
                            <Image
                              src={product.seller.profile_image}
                              alt={product.seller.name}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#fdfbf7] flex items-center justify-center text-[#b08d55]">
                              <User className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                          <div className="bg-green-500 w-3 h-3 rounded-full border border-white"></div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 group-hover:text-[#b08d55] transition-colors">
                          {product.seller?.name}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-[#fdfbf7] text-[#8c6b30] px-2 py-0.5 rounded border border-[#e6dcc5]">
                            Verified Artisan
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {product.seller?.store_description || product.seller?.bio || t('product.artisanBioFallback')}
                        </p>
                        <Link
                          href={`/stall/${product.seller_id}`}
                          className="text-sm font-bold text-[#b08d55] hover:text-[#8c6b30] flex items-center gap-1"
                        >
                          View Collection <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
              {/* Auction Widget */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">{t('auction.title')}</h3>
                <AuctionWidget productId={product.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}



        {/* AR Viewer */}
        {
          arOpen && (
            <ARViewer open={arOpen} onClose={() => setArOpen(false)} imageUrl={arImageUrl} productType={arProductType} />
          )
        }

        {/* Gift Modal (simple) */}
        {
          giftModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
                <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl" onClick={() => { setGiftModalOpen(false); setGiftSuccess(false); }}>&times;</button>
                <h2 className="text-2xl font-bold mb-4">{t('product.giftModalTitle')}</h2>

                {/* Gift Type Selection */}
                <div className="mb-6">
                  <label className="block mb-3 font-semibold">{t('product.chooseGiftType')}</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setGiftType('individual')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${giftType === 'individual'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-pink-300'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">🎁</div>
                        <div className="font-semibold">{t('product.individualGift')}</div>
                        <div className="text-xs text-gray-500">{t('product.individualGiftDesc')}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setGiftType('group')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${giftType === 'group'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">👥</div>
                        <div className="font-semibold">{t('product.groupGift')}</div>
                        <div className="text-xs text-gray-500">{t('product.groupGiftDesc')}</div>
                      </div>
                    </button>
                  </div>
                </div>
                {giftError && <div className="mb-2 text-pink-700 bg-pink-100 border border-pink-300 rounded px-3 py-2 text-sm">{giftError}</div>}

                {giftType === 'individual' ? (
                  <>
                    {giftSuccess ? (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold text-green-600 mb-2">{t('product.giftSuccessTitle')}</h3>
                        <p className="text-gray-600 mb-6">{t('product.giftSuccessDesc', { name: selectedRecipient?.name })}</p>
                        <button
                          onClick={() => {
                            setGiftModalOpen(false);
                            setGiftSuccess(false);
                            setSelectedRecipient(null);
                            setGiftRecipient("");
                            setRecipientQuery("");
                            setGiftMessage("");
                          }}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-200 shadow-lg hover:shadow-xl"
                        >
                          {t('product.close')}
                        </button>
                      </div>
                    ) : (
                      <>
                        {!selectedRecipient ? (
                          <>
                            <label className="block mb-2 font-semibold">{t('product.recipientLabel')}</label>
                            <input
                              type="text"
                              value={recipientQuery}
                              onChange={e => {
                                setRecipientQuery(e.target.value);
                                setGiftRecipient("");
                              }}
                              className="w-full mb-1 p-2 border rounded-lg"
                              placeholder={t('product.recipientPlaceholder')}
                              disabled={gifting}
                            />
                            {recipientLoading && <div className="text-xs text-gray-400 mb-2">{t('product.recipientSearching')}</div>}
                            {recipientResults.length > 0 && (
                              <ul className="bg-white border rounded-lg shadow max-h-48 overflow-auto mb-2">
                                {recipientResults.map(profile => (
                                  <li
                                    key={profile.id}
                                    className="flex items-center px-3 py-2 hover:bg-pink-50 cursor-pointer gap-3"
                                    onClick={() => {
                                      setSelectedRecipient(profile);
                                      setGiftRecipient(profile.id);
                                      setRecipientQuery(profile.name + " (" + profile.email + ")");
                                      setRecipientResults([]);
                                    }}
                                  >
                                    {profile.profile_image && (
                                      <img src={profile.profile_image} alt="profile" className="w-7 h-7 rounded-full object-cover" />
                                    )}
                                    <span className="font-medium">{profile.name}</span>
                                    <span className="text-xs text-gray-500">{profile.email}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <div className="mb-2 flex items-center gap-3 p-2 bg-pink-50 rounded">
                            {selectedRecipient.profile_image && (
                              <img src={selectedRecipient.profile_image} alt="profile" className="w-7 h-7 rounded-full object-cover" />
                            )}
                            <span className="font-medium">{selectedRecipient.name}</span>
                            <span className="text-xs text-gray-500">{selectedRecipient.email}</span>
                            <button className="ml-2 px-2 text-sm text-pink-500 underline" onClick={() => {
                              setSelectedRecipient(null); setGiftRecipient(""); setRecipientQuery("");
                            }}>{t('product.changeRecipient')}</button>
                          </div>
                        )}
                        <label className="block mb-2 font-semibold">{t('product.personalMessageLabel')}</label>
                        <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} className="w-full mb-4 p-2 border rounded-lg" placeholder={t('product.personalMessagePlaceholder')} />
                        <button
                          className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                          onClick={handleSendGift}
                          disabled={gifting || !giftRecipient}
                        >
                          {gifting ? t('product.sending') : t('product.sendIndividualGift')}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-purple-700 mb-2">{t('product.groupGiftTitle')}</h3>
                    <p className="text-gray-600 mb-6">{t('product.groupGiftDesc')}</p>
                    <button
                      onClick={() => {
                        console.log('Opening group gift modal...');
                        setGiftModalOpen(false);
                        setGroupGiftModalOpen(true);
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-200 shadow-lg hover:shadow-xl"
                    >
                      {t('product.createGroupGift')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* Group Gift Modal */}
        <GroupGiftModal
          isOpen={groupGiftModalOpen}
          onClose={() => setGroupGiftModalOpen(false)}
          productId={product?.id}
          productTitle={product?.title}
          productPrice={product?.price}
          productImage={product?.image_url}
        />

        {/* Custom Request Modal */}
        {
          customRequestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
                <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl" onClick={() => { setCustomRequestModalOpen(false); setCustomRequestSuccess(false); setCustomRequestMessage(""); setCustomRequestError(null); }}>&times;</button>
                <h2 className="text-2xl font-bold mb-4">{t('product.customRequestModalTitle')}</h2>
                {customRequestError && <div className="mb-2 text-teal-700 bg-teal-100 border border-teal-300 rounded px-3 py-2 text-sm">{customRequestError}</div>}
                {customRequestSuccess ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Request Sent!</h3>
                    <p className="text-gray-600 mb-2">Your custom craft request has been sent to the seller.</p>
                    <p className="text-teal-700 bg-teal-50 border border-teal-200 rounded px-3 py-2 text-sm mb-4">The seller will reach out to you through DM (Direct Message) for further details and updates.</p>
                    <button
                      onClick={() => {
                        setCustomRequestModalOpen(false);
                        setCustomRequestSuccess(false);
                        setCustomRequestMessage("");
                        setCustomRequestError(null);
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-200 shadow-lg hover:shadow-xl"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="block mb-2 font-semibold">{t('product.customRequestLabel')}</label>
                    <div className="relative mb-4">
                      <textarea
                        value={customRequestMessage}
                        onChange={e => setCustomRequestMessage(e.target.value)}
                        className="w-full p-2 border rounded-lg pr-12"
                        placeholder={t('product.customRequestPlaceholder')}
                        disabled={customRequestLoading}
                        rows={4}
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-full p-2 shadow focus:outline-none"
                        title={t('product.speakYourRequest')}
                        onClick={() => {
                          if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                            const win = window as typeof window & {
                              SpeechRecognition?: typeof SpeechRecognition;
                              webkitSpeechRecognition?: typeof SpeechRecognition;
                            };
                            const SpeechRecognitionCtor: typeof SpeechRecognition | undefined = win.SpeechRecognition || win.webkitSpeechRecognition;
                            if (!SpeechRecognitionCtor) {
                              setCustomRequestError('Speech recognition not supported in this browser.');
                              return;
                            }
                            const recognition = new SpeechRecognitionCtor();
                            // Map app language to BCP-47 code
                            const langMap: Record<string, string> = {
                              en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kannada: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', malayalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', telugu: 'te-IN', urdu: 'ur-IN', as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
                            };
                            // Use currentLanguage or i18n.language
                            const appLang = (typeof currentLanguage !== 'undefined' && currentLanguage) ? currentLanguage : (typeof i18n !== 'undefined' && i18n.language ? i18n.language : 'en');
                            recognition.lang = langMap[appLang] || appLang || 'en-IN';
                            recognition.interimResults = false;
                            recognition.maxAlternatives = 1;
                            recognition.onresult = (event: SpeechRecognitionEvent) => {
                              const transcript = event.results[0][0].transcript;
                              setCustomRequestMessage(prev => prev ? prev + ' ' + transcript : transcript);
                            };
                            recognition.onerror = (event: Event) => {
                              const error = (event as { error?: string }).error;
                              setCustomRequestError('Voice input error: ' + (error || 'Unknown error'));
                            };
                            recognition.start();
                          } else {
                            setCustomRequestError('Speech recognition not supported in this browser.');
                          }
                        }}
                        disabled={customRequestLoading}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v-1.5m0-13.5a3.75 3.75 0 013.75 3.75v6a3.75 3.75 0 01-7.5 0v-6A3.75 3.75 0 0112 3.75zm0 0v13.5m6-6a6 6 0 11-12 0" />
                        </svg>
                      </button>
                    </div>
                    <button
                      className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                      onClick={async () => {
                        setCustomRequestLoading(true);
                        setCustomRequestError(null);
                        try {
                          if (!customRequestMessage.trim()) {
                            setCustomRequestError('Please describe your custom craft request.');
                            setCustomRequestLoading(false);
                            return;
                          }
                          if (!user) {
                            setCustomRequestError('You must be signed in to send a request.');
                            setCustomRequestLoading(false);
                            return;
                          }
                          const res = await fetch('/api/custom-request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              product_id: product?.id,
                              seller_id: product?.seller_id,
                              buyer_id: user.id,
                              description: customRequestMessage,
                            }),
                          });
                          const json = await res.json();
                          if (!res.ok) {
                            setCustomRequestError(json?.error || 'Could not send request.');
                            setCustomRequestLoading(false);
                            return;
                          }
                          setCustomRequestSuccess(true);
                          setCustomRequestMessage("");
                        } catch (err) {
                          setCustomRequestError('Could not send request – try again later.');
                        }
                        setCustomRequestLoading(false);
                      }}
                      disabled={customRequestLoading || !customRequestMessage.trim()}
                    >
                      {customRequestLoading ? t('product.sending') : t('product.sendCustomRequest')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        }
        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-gray-100 pt-16 col-span-full">
            <h2 className="text-3xl font-serif text-[#3d0000] [:root[data-theme=dark]_&]:text-orange-100 mb-10 text-center">
              {t('product.youMightAlsoLike', { defaultValue: 'You Might Also Like' })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((rp) => (
                <Link href={`/product/${rp.id}`} key={rp.id} className="group">
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                    <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                      {rp.image_url ? (
                        <Image
                          src={rp.image_url}
                          alt={rp.title || 'Product'}
                          fill
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-3xl">🖼️</div>
                      )}
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-serif text-lg text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-700 transition-colors">
                        {rp.title}
                      </h3>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-medium text-[#b08d55]">₹{rp.price}</span>
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          {/* Reuse ArrowLeft or similar icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Cart Modal */}
        {cartModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-[var(--bg-1)] border-2 rounded-xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden ${
                cartModalStatus === 'success'
                  ? 'border-green-500'
                  : 'border-red-500'
              }`}
            >
              <button
                onClick={() => setCartModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text)]/60 hover:text-[var(--text)] text-2xl transition-colors"
              >
                ×
              </button>

              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">
                  {cartModalStatus === 'success' ? '✅' : '❌'}
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${
                  cartModalStatus === 'success'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {cartModalStatus === 'success' ? 'Added to Cart!' : 'Error'}
                </h3>
                <p className="text-[var(--text)] mb-6">
                  {cartModalMessage}
                </p>
                <button
                  onClick={() => {
                    setCartModalOpen(false)
                    if (cartModalStatus === 'success') {
                      setQuantity(1)
                    }
                  }}
                  className={`w-full px-6 py-3 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${
                    cartModalStatus === 'success'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-200'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 focus:ring-red-200'
                  } shadow-lg hover:shadow-xl`}
                >
                  {cartModalStatus === 'success' ? 'Continue Shopping' : 'Close'}
                </button>
                {cartModalStatus === 'success' && (
                  <Link
                    href="/cart"
                    onClick={() => setCartModalOpen(false)}
                    className="mt-3 block w-full px-6 py-3 bg-[var(--text)] text-[var(--bg-1)] font-semibold rounded-xl hover:bg-[#b08d55] transition-all duration-300 transform hover:scale-105"
                  >
                    View Cart
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div >
    </div >
  )
}
