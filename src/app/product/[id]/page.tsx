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
  const [cartModalStatus, setCartModalStatus] = useState<'success'|'error'|null>(null);
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
        translated.seller.bio = await translateText(data.seller?.bio || '' , lang)
        translated.seller.store_description = await translateText(data.seller?.store_description || '' , lang)
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
        const { data: a } = await supabase.from('auctions').select('*').eq('product_id', productId).in('status', ['scheduled','running']).limit(1)
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add to cart error:', err);
      setCartModalStatus('error');
      setCartModalMessage(t('cart.addedError'));
    }
    setCartModalOpen(true);
  }

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
    <div className="min-h-screen bg-[var(--bg-2)] py-8">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Link
            href="/marketplace"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('marketplace.backToMarketplace')}
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card rounded-xl p-6"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-2)]">
              {/* Collaboration Badge */}
              {product.isCollaborative && (
                <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  🤝 {t('product.collaborativeBadge')}
                </div>
              )}
              {/* Virtual Product Badge */}
              {product.is_virtual && (
                <div className="absolute bottom-4 right-4 z-10 bg-gradient-to-r from-cyan-400 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                  🧩 {t('product.virtualBadge')}
                </div>
              )}
              
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center ${
                  product.isCollaborative
                    ? 'from-yellow-100 to-orange-100'
                    : 'from-orange-100 to-red-100'
                }`}>
                  <span className={`text-8xl ${
                    product.isCollaborative ? 'text-yellow-400' : 'text-orange-400'
                  }`}>🎨</span>
                </div>
              )}
              
              {/* AR Button */}
              {product.image_url && (
                <div className="absolute bottom-4 left-4 z-10">
                  <button
                    onClick={() => {
                      setArImageUrl(product.image_url)
                      setArProductType((product.product_type as 'vertical' | 'horizontal' | undefined) || 'vertical')
                      setArOpen(true)
                    }}
                    className="group relative p-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full hover:from-green-200 hover:to-emerald-200 transition-all duration-200 shadow-lg hover:shadow-xl"
                    title={t('product.viewInAR')}
                  >
                    <span role="img" aria-label="AR" className="text-xl">📱</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                      {t('product.arTooltip')}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Product Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Product Info */}
            <div>
              <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
                {product.title}
              </h1>
              <p className="text-lg text-[var(--muted)] mb-4">
                {product.category}
              </p>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[var(--muted)]">(4.8 • 24 {t('product.reviews').toLowerCase()})</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                ₹{product.price}
              </p>
            </div>


            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                {t('product.description')}
              </h3>
              <p className="text-[var(--muted)] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Heritage Story Narration */}
            {product.product_story && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, type: 'spring' }}
                className="relative mt-8 mb-2"
              >
                <div className="card-glass rounded-2xl p-6 border-l-8 border-orange-400 bg-gradient-to-br from-orange-50/80 to-pink-50/60 shadow-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 shadow text-white text-2xl">
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-7 h-7'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 18.75v-13.5m0 0c-2.485 0-4.5 2.015-4.5 4.5m4.5-4.5c2.485 0 4.5 2.015 4.5 4.5m-9 4.5c0 2.485 2.015 4.5 4.5 4.5m4.5-4.5c0 2.485-2.015 4.5-4.5 4.5' />
                      </svg>
                    </span>
                    <span className="text-xl font-bold text-orange-700">
                      {t('product.storyLabel')}
                    </span>
                  </div>
                  <p className="text-[var(--muted)] leading-relaxed whitespace-pre-line text-base sm:text-lg font-medium" style={{ wordBreak: 'break-word' }}>
                    {/* Show translated story if available, else fallback to original */}
                    {translatedStory || product.product_story}
                  </p>
                  <button
                    type="button"
                    aria-label={isNarrating ? 'Stop narration' : 'Narrate story'}
                    title={isNarrating ? 'Stop narration' : 'Listen to story'}
                    className={`absolute bottom-4 right-4 p-3 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 shadow-lg hover:scale-110 transition-transform focus:outline-none border-4 border-white ${isNarrating ? 'ring-4 ring-orange-300 animate-pulse' : ''}`}
                    style={{ zIndex: 10 }}
                    onClick={async () => {
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        if (isNarrating) {
                          window.speechSynthesis.cancel();
                          setIsNarrating(false);
                        } else {
                          window.speechSynthesis.cancel();
                          // Use the same langMap as voice input for narration
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
                            // Also support short codes
                            as: 'as-IN',
                            bn: 'bn-IN',
                            brx: 'brx-IN',
                            doi: 'doi-IN',
                            gu: 'gu-IN',
                            kn: 'kn-IN',
                            ks: 'ks-IN',
                            kok: 'kok-IN',
                            mai: 'mai-IN',
                            ml: 'ml-IN',
                            mni: 'mni-IN',
                            mr: 'mr-IN',
                            ne: 'ne-NP',
                            or: 'or-IN',
                            pa: 'pa-IN',
                            sa: 'sa-IN',
                            sat: 'sat-IN',
                            sd: 'sd-IN',
                            ta: 'ta-IN',
                            te: 'te-IN',
                            ur: 'ur-IN',
                          };
                          const lang = langMap[currentLanguage] || currentLanguage || 'en-IN';
                          // Translate story to user's language before narration
                          let storyText = product.product_story ?? '';
                          try {
                            storyText = await translateText(storyText, currentLanguage);
                          } catch (err) {
                            // fallback to original if translation fails
                          }
                          const utter = new window.SpeechSynthesisUtterance(storyText);
                          utter.lang = lang;
                          // Try to select the best matching voice
                          const voices = window.speechSynthesis.getVoices();
                          const matchVoice = voices.find(v => v.lang === lang) ||
                            voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0])) ||
                            voices.find(v => v.lang && v.lang.startsWith('en'));
                          if (matchVoice) utter.voice = matchVoice;
                          utter.rate = 1;
                          utter.pitch = 1;
                          utter.onend = () => setIsNarrating(false);
                          utter.onerror = () => setIsNarrating(false);
                          utterRef.current = utter;
                          setIsNarrating(true);
                          // Some browsers need async getVoices, so delay if voices not loaded
                          if (!voices.length) {
                            window.speechSynthesis.onvoiceschanged = () => {
                              const voices2 = window.speechSynthesis.getVoices();
                              const matchVoice2 = voices2.find(v => v.lang === lang) ||
                                voices2.find(v => v.lang && v.lang.startsWith(lang.split('-')[0])) ||
                                voices2.find(v => v.lang && v.lang.startsWith('en'));
                              if (matchVoice2) utter.voice = matchVoice2;
                              window.speechSynthesis.speak(utter);
                            };
                          } else {
                            window.speechSynthesis.speak(utter);
                          }
                        }
                      } else {
                        alert('Speech synthesis not supported in this browser.');
                      }
                    }}
                  >
                    {isNarrating ? (
                      // Speaker off icon
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 01-9 0m9 0a4.5 4.5 0 00-9 0m9 0V4.75a.75.75 0 00-1.28-.53l-3.22 3.22a.75.75 0 01-1.06 0l-3.22-3.22A.75.75 0 004.5 4.75V19.25a.75.75 0 001.28.53l3.22-3.22a.75.75 0 011.06 0l3.22 3.22a.75.75 0 001.28-.53V12z" />
                      </svg>
                    ) : (
                      // Speaker with sound waves icon
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9zm7.5 3a3.5 3.5 0 01-7 0 3.5 3.5 0 017 0z" />
                      </svg>
                    )}
                  </button>
                  <div className="text-xs text-orange-500 mt-2 italic">{t('product.storyNarrateHint')}</div>
                </div>
              </motion.div>
            )}

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--muted)] mb-3 tracking-wide">
                    {t('product.quantity')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:bg-gradient-to-br hover:from-orange-50 hover:to-red-50 hover:border-orange-400 text-gray-700 font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white shadow-sm [data-theme='dark']:border-gray-600 [data-theme='dark']:bg-gray-800 [data-theme='dark']:text-gray-300 [data-theme='dark']:hover:from-orange-900/30 [data-theme='dark']:hover:to-red-900/30 [data-theme='dark']:hover:border-orange-500 [data-theme='dark']:focus:ring-orange-600 [data-theme='dark']:shadow-none"
                    >
                      -
                    </button>
                    <span className="w-14 text-center text-lg font-bold text-gray-800 bg-gradient-to-br from-orange-50 to-red-50 py-1.5 rounded-lg border-2 border-orange-200 shadow-sm [data-theme='dark']:text-gray-100 [data-theme='dark']:bg-gradient-to-br [data-theme='dark']:from-gray-800 [data-theme='dark']:to-gray-700 [data-theme='dark']:border-orange-700">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:bg-gradient-to-br hover:from-orange-50 hover:to-red-50 hover:border-orange-400 text-gray-700 font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white shadow-sm [data-theme='dark']:border-gray-600 [data-theme='dark']:bg-gray-800 [data-theme='dark']:text-gray-300 [data-theme='dark']:hover:from-orange-900/30 [data-theme='dark']:hover:to-red-900/30 [data-theme='dark']:hover:border-orange-500 [data-theme='dark']:focus:ring-orange-600 [data-theme='dark']:shadow-none"
                    >
                      +
                    </button>
                  </div>
                </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Add to Cart Button */}
                <button
                  onClick={addToCart}
                  disabled={hasActiveAuction}
                  className={`group relative flex-1 flex items-center justify-center px-4 py-2.5 font-semibold rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-200/50 ${
                    hasActiveAuction 
                      ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300 shadow-none [data-theme="dark"]:from-gray-800 [data-theme="dark"]:to-gray-700 [data-theme="dark"]:text-gray-500 [data-theme="dark"]:border-gray-700' 
                      : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 [data-theme="dark"]:from-blue-600 [data-theme="dark"]:via-blue-700 [data-theme="dark"]:to-indigo-700 [data-theme="dark"]:hover:from-blue-700 [data-theme="dark"]:hover:via-blue-800 [data-theme="dark"]:hover:to-indigo-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110 ${
                      hasActiveAuction ? 'bg-gray-200/50 [data-theme="dark"]:bg-gray-700/50' : 'bg-white/20 backdrop-blur-sm [data-theme="dark"]:bg-white/10'
                    }`}>
                      <ShoppingCart className={`w-3.5 h-3.5 ${hasActiveAuction ? 'text-gray-400 [data-theme="dark"]:text-gray-600' : 'text-white'}`} />
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-wide">
                      {hasActiveAuction ? t('auction.onAuction') : t('product.addToCart')}
                    </span>
                  </div>
                  {!hasActiveAuction && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 [data-theme='dark']:from-blue-500 [data-theme='dark']:to-indigo-600"></div>
                      <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 [data-theme='dark']:bg-white/10"></div>
                    </>
                  )}
                </button>

                {/* Cart Modal */}
                {cartModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full relative flex flex-col items-center">
                      <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setCartModalOpen(false)}>&times;</button>
                      {cartModalStatus === 'success' ? (
                        <>
                          <div className="text-6xl mb-4">🛒</div>
                          <h2 className="text-2xl font-bold text-green-600 mb-2">{t('cart.addedSuccessTitle') || 'Added to Cart!'}</h2>
                          <p className="text-gray-700 mb-6">{cartModalMessage}</p>
                          <Link href="/cart" className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-lg hover:shadow-xl text-center">{t('cart.viewCart')}</Link>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-4">⚠️</div>
                          <h2 className="text-2xl font-bold text-red-600 mb-2">{t('cart.addedErrorTitle') || 'Could not add to Cart'}</h2>
                          <p className="text-gray-700 mb-6">{cartModalMessage}</p>
                          <button onClick={() => setCartModalOpen(false)} className="w-full px-6 py-3 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 font-semibold rounded-xl hover:from-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200 shadow-lg hover:shadow-xl">{t('cart.close')}</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Wishlist Button */}
                <button 
                  className="group relative px-4 py-2.5 border-2 border-gray-300/50 text-gray-700 font-semibold rounded-xl hover:border-red-400/60 hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 hover:text-red-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-red-100/50 shadow-sm hover:shadow-md backdrop-blur-sm bg-white/50 [data-theme='dark']:border-gray-600/50 [data-theme='dark']:text-gray-300 [data-theme='dark']:hover:border-red-500/70 [data-theme='dark']:hover:from-red-900/20 [data-theme='dark']:hover:to-pink-900/20 [data-theme='dark']:hover:text-red-400 [data-theme='dark']:focus:ring-red-900/30 [data-theme='dark']:shadow-none [data-theme='dark']:hover:shadow-lg [data-theme='dark']:bg-gray-800/50" 
                  title={t('product.addToWishlist')}
                >
                  <div className="flex items-center justify-center relative z-10">
                    <Heart className="w-4 h-4 transition-all duration-300 group-hover:fill-red-500 group-hover:scale-110 [data-theme='dark']:group-hover:fill-red-400" />
                  </div>
                </button>
              </div>

              {/* Secondary Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                {/* Gift Button */}
                <button
                  className="group relative flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-purple-200/50 overflow-hidden [data-theme='dark']:from-purple-600 [data-theme='dark']:via-purple-700 [data-theme='dark']:to-violet-700 [data-theme='dark']:shadow-purple-900/30 [data-theme='dark']:hover:shadow-purple-900/50 [data-theme='dark']:focus:ring-purple-900/30"
                  title={t('product.giftButtonTooltip')}
                  onClick={() => setGiftModalOpen(true)}
                >
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 [data-theme='dark']:bg-white/10">
                      <span role="img" aria-label="gift" className="text-base">🎁</span>
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-wide">{t('product.sendAsGift')}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-violet-400 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 [data-theme='dark']:from-purple-400 [data-theme='dark']:to-violet-500"></div>
                  <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 [data-theme='dark']:bg-white/10"></div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Custom Request Button */}
                <button
                  className="group relative flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-teal-200/50 overflow-hidden [data-theme='dark']:from-teal-600 [data-theme='dark']:via-teal-700 [data-theme='dark']:to-emerald-700 [data-theme='dark']:shadow-emerald-900/30 [data-theme='dark']:hover:shadow-emerald-900/50 [data-theme='dark']:focus:ring-teal-900/30"
                  title={t('product.customRequestButtonTooltip')}
                  onClick={() => setCustomRequestModalOpen(true)}
                >
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 [data-theme='dark']:bg-white/10">
                      <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-wide">{t('product.customRequest')}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-300 to-emerald-400 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 [data-theme='dark']:from-teal-400 [data-theme='dark']:to-emerald-500"></div>
                  <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 [data-theme='dark']:bg-white/10"></div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>

            {/* Artisan Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card-glass rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
                {product.isCollaborative 
                  ? `🤝 ${t('product.meetCollaborativeArtisans')}`
                  : t('product.meetTheArtisan')
                }
              </h3>
              
              {product.isCollaborative && product.collaborators ? (
                // Show all collaborators
                <div className="space-y-4">
                  {product.collaborators.map((collaborator, index) => (
                    <div key={collaborator.id} className="flex items-center space-x-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/30">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                        {collaborator.profile_image ? (
                          <Image
                            src={collaborator.profile_image}
                            alt={collaborator.name}
                            width={64}
                            height={64}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[var(--text)]">
                          {collaborator.name}
                        </h4>
                        <p className="text-[var(--muted)] text-sm line-clamp-2">
                          {collaborator.store_description || collaborator.bio || t('product.artisanBioFallback')}
                        </p>
                        <Link
                          href={`/stall/${collaborator.id}`}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium mt-1 inline-block"
                        >
                          {t('product.viewCollaboratorProducts')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Show single seller
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                    {product.seller?.profile_image ? (
                      <Image
                        src={product.seller.profile_image}
                        alt={product.seller.name}
                        width={64}
                        height={64}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--text)]">
                      {product.seller?.name}
                    </h4>
                    <p className="text-[var(--muted)] text-sm">
                      {product.seller?.store_description || product.seller?.bio || t('product.artisanBioFallback')}
                    </p>
                    <Link
                      href={`/stall/${product.seller_id}`}
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium mt-1 inline-block"
                    >
                      {t('product.viewAllProducts')}
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
            {/* Auction Widget */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">{t('auction.title')}</h3>
              <AuctionWidget productId={product.id} />
            </div>
          </motion.div>
        </div>
      </div>
      

      {/* AR Viewer */}
      {arOpen && (
  <ARViewer open={arOpen} onClose={() => setArOpen(false)} imageUrl={arImageUrl} productType={arProductType} />
      )}

      {/* Gift Modal (simple) */}
      {giftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl" onClick={() => {setGiftModalOpen(false); setGiftSuccess(false);}}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">{t('product.giftModalTitle')}</h2>
            
            {/* Gift Type Selection */}
            <div className="mb-6">
              <label className="block mb-3 font-semibold">{t('product.chooseGiftType')}</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setGiftType('individual')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    giftType === 'individual'
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
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    giftType === 'group'
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
                                  setRecipientQuery(profile.name+" ("+profile.email+")");
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
      )}

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
        {customRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl" onClick={() => {setCustomRequestModalOpen(false); setCustomRequestSuccess(false); setCustomRequestMessage(""); setCustomRequestError(null);}}>&times;</button>
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
        )}
    </div>
  )
}
