'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { logActivity } from '@/lib/activity'
import { ArrowLeft, User, Palette, MapPin, Calendar, Users, MessageCircle, Send } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { Product as ModalProduct } from '@/types/product';
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray, translateText } from '@/lib/translate'
import { ShareModal } from '@/components/ShareModal';

type Product = Database['public']['Tables']['products']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type CollaborativeProduct = {
  product: Product
  partners: Profile[]
  isCollaborative: boolean
}

type CollabProductRow = {
  product: Product
  collaboration: {
    id: string
    initiator_id: string
    partner_id: string
    status: string
  } | null
}

import dynamic from 'next/dynamic';
const Market3DButton = dynamic(() => import('@/components/Market3DButton'), { ssr: false });
const MarketplaceStalls3D = dynamic(() => import('@/components/MarketplaceStalls3D'), { ssr: false });

export default function StallPage() {
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()
  const params = useParams()
  const { user } = useAuth()
  const [stallProfile, setStallProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [collaborativeProducts, setCollaborativeProducts] = useState<CollaborativeProduct[]>([])
  const [loading, setLoading] = useState(true)
  // For 3D modal: all sellers and their products
  type SellerGroup = {
    sellerId: string;
    sellerName: string;
    products: ModalProduct[];
  };

  const [allSellers, setAllSellers] = useState<SellerGroup[]>([]);
  const [show3DModal, setShow3DModal] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // Followers logic
  useEffect(() => {
    const fetchFollowers = async () => {
      if (!stallProfile?.id || !user?.id) return;
      setFollowersLoading(true);
      // Count followers
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', stallProfile.id);
      setFollowersCount(count || 0);
      // Am I following?
      const { data: existing } = await supabase
        .from('followers')
        .select('*')
        .eq('user_id', stallProfile.id)
        .eq('follower_id', user.id)
        .maybeSingle();
      setIsFollowing(!!existing);
      setFollowersLoading(false);
    };
    fetchFollowers();
  }, [stallProfile?.id, user?.id]);

  const handleFollowClick = async () => {
    if (!stallProfile?.id || !user?.id || stallProfile.id === user.id) return;
    setFollowersLoading(true);
    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('user_id', stallProfile.id)
        .eq('follower_id', user.id);
      setFollowersCount(f => Math.max(0, f - 1));
      setIsFollowing(false);
    } else {
      await supabase
        .from('followers')
        .insert({ user_id: stallProfile.id, follower_id: user.id });
      setFollowersCount(f => f + 1);
      setIsFollowing(true);
    }
    setFollowersLoading(false);
  };

  useEffect(() => {
    if (params.id) {
      fetchStallData(params.id as string)
      fetchAllSellers();
    }
  }, [params.id, currentLanguage])

  // Fetch all sellers and their products for 3D modal
  const fetchAllSellers = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*, seller:profiles(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Group by seller
      const sellerMap: Record<string, SellerGroup> = {};
      (productsData || []).forEach((p) => {
        const sellerId: string = p.seller_id;
        const sellerName: string = p.seller?.name || sellerId;
        if (!sellerMap[sellerId]) sellerMap[sellerId] = { sellerId, sellerName, products: [] };
    // Allow all categories, including user-defined
    const safeCategory: ModalProduct['category'] = p.category;
        // Build ModalProduct type for compatibility
        const modalProduct: ModalProduct = {
          ...p,
          category: safeCategory,
          name: p.title || '',
        };
        sellerMap[sellerId].products.push(modalProduct);
      });
      setAllSellers(Object.values(sellerMap));
    } catch (err) {
      setAllSellers([]);
    }
  };

  useEffect(() => {
    if (user && params.id) {
      logActivity({ userId: user.id, activityType: 'stall_view', stallId: params.id as string })
    }
  }, [user, params.id])

  const fetchStallData = async (stallId: string) => {
    try {
      // Fetch stall profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', stallId)
        .single()

      if (profileError) throw profileError
      // Translate profile name/bio/description
      try {
        const lang = currentLanguage
        const name = await translateText(profileData.name || '', lang)
        const bio = await translateText(profileData.bio || '', lang)
        const desc = await translateText(profileData.store_description || '', lang)
        setStallProfile({ ...profileData, name, bio, store_description: desc })
      } catch {
        setStallProfile(profileData)
      }

      // Fetch stall products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', stallId)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError
      // Translate product titles and categories in this stall
      try {
        const lang = currentLanguage
        const titles = (productsData || []).map(p => p.title || '')
        const cats = (productsData || []).map(p => p.category || '')
        const trTitles = await translateArray(titles, lang)
        const trCats = await translateArray(cats, lang)
        const translated = (productsData || []).map((p, idx) => ({ ...p, title: trTitles[idx] || p.title, category: trCats[idx] || p.category }))
        setProducts(translated as Product[])
      } catch {
        setProducts(productsData || [])
      }

      // Fetch collaborative products where this seller is involved
      const { data: collabProductsData } = await supabase
        .from('collaborative_products')
        .select(`
          *,
          product:products(*),
          collaboration:collaborations(
            id,
            initiator_id,
            partner_id,
            status
          )
        `)
        .eq('collaboration.status', 'accepted')

      // Filter to only show products for active collaborations involving this seller
      const relevantCollabProducts = (collabProductsData || []).filter((cp: CollabProductRow) => {
        const collab = cp.collaboration
        return collab && (collab.initiator_id === stallId || collab.partner_id === stallId)
      })

      // Get partner information for each collaborative product
      const collabProductsWithPartners = await Promise.all(
        relevantCollabProducts.map(async (cp: CollabProductRow) => {
          const collab = cp.collaboration!
          const partnerId = collab.initiator_id === stallId ? collab.partner_id : collab.initiator_id

          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerId)
            .single()

          return {
            product: cp.product,
            partners: partnerProfile ? [partnerProfile as Profile] : [],
            isCollaborative: true
          }
        })
      )

      setCollaborativeProducts(collabProductsWithPartners)
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching stall data:', error)
      setLoading(false)
    }
  }

  // Stall share logic
  const getShareUrl = () => {
    if (typeof window === 'undefined' || !params.id) return '';
    return `https://kalaaamitra.vercel.app/stall/${params.id}`;
  };
  const getShareTitle = () => (stallProfile?.name ? `${stallProfile.name}'s ${t('navbar.profile')}` : t('navbar.profile'));

  const handleCopyLink = async () => {
    try {
      const url = getShareUrl();
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setShowShareModal(false);
    } catch (e) {
      // noop
    }
  };
  const handleNativeShare = async () => {
    const url = getShareUrl();
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: getShareTitle(), text: t('profile.checkOutProfile'), url });
        setShowShareModal(false);
        return;
      } catch {
        // fall through to web intents
      }
    }
    const text = encodeURIComponent(`${t('profile.checkOutProfile')}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    if (!url) return;
    const text = encodeURIComponent(`${t('profile.checkOutProfile')}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  const handleShareTwitter = () => {
    const url = getShareUrl();
    if (!url) return;
    const text = encodeURIComponent(t('profile.checkOutProfile'));
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`;
    window.open(shareUrl, '_blank');
  };
  const handleShareFacebook = () => {
    const url = getShareUrl();
    if (!url) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  // Floating DM button handler
  const handleFloatingDM = useCallback(() => {
    if (stallProfile && user && user.id !== stallProfile.id) {
      window.location.href = `/dm?userId=${stallProfile.id}`;
    }
  }, [stallProfile, user]);

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

  if (!stallProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{t('errors.notFound')}</p>
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

        {/* Stall Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card-glass rounded-xl p-8 mb-8 text-center"
        >
          <div className="w-24 h-24 bg-[var(--bg-2)] rounded-full flex items-center justify-center mx-auto mb-6">
            {stallProfile.profile_image ? (
              <Image
                src={stallProfile.profile_image}
                alt={stallProfile.name}
                width={96}
                height={96}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-orange-600" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">
            {stallProfile.name}&apos;s {t('navbar.profile')}
          </h1>
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--saffron)]" />
              <span className="font-semibold text-[var(--text)] text-base">{followersLoading ? <span className="animate-pulse text-[var(--muted)]">...</span> : followersCount}</span>
              <span className="text-xs text-[var(--muted)] ml-1">Followers</span>
            </div>
            {user && stallProfile && user.id !== stallProfile.id && (
              <button
                className={`btn-indian-secondary px-4 py-1 md:py-2 rounded-xl flex items-center gap-2 text-sm md:text-base ${followersLoading ? 'opacity-60 pointer-events-none' : ''}`}
                onClick={handleFollowClick}
                disabled={followersLoading}
              >
                <Users className="w-4 h-4" />
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          {stallProfile.store_description && (
            <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-6">
              {stallProfile.store_description}
            </p>
          )}
          {!stallProfile.store_description && stallProfile.bio && (
            <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-6">
              {stallProfile.bio}
            </p>
          )}
          <div className="flex justify-center space-x-8 text-sm text-[var(--muted)] mb-6">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{t('navbar.dashboard')}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{t('profile.memberSince', { defaultValue: 'Member since' })} {new Date(stallProfile.created_at).getFullYear()}</span>
            </div>
          </div>
          {/* 3D Stall and Share Buttons with Spacing */}
          <div className="flex justify-center gap-3 mb-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
              onClick={() => setShow3DModal(true)}
            >
              <Palette className="w-5 h-5 text-white drop-shadow" />
              {t('stallCustomizationModal.visit') || 'View 3D Stall'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500 text-white shadow hover:scale-105 transition"
              onClick={() => setShowShareModal(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25V6a3 3 0 1 0-6 0v2.25m6 0H9m6 0a2.25 2.25 0 0 1 0 4.5h-6a2.25 2.25 0 1 1 0-4.5m0 0V6a3 3 0 1 1 6 0v2.25" />
              </svg>
              {t('profile.share') || 'Share Stall'}
            </button>
            {/* Message Button: Only show if user is logged in and not viewing their own stall */}
            {user && stallProfile && user.id !== stallProfile.id && (
              <a
                href={`/dm?userId=${stallProfile.id}`}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold bg-gradient-to-r from-blue-500 via-green-500 to-teal-500 text-white shadow hover:scale-105 transition"
                title={t('dm.messages')}
                onClick={e => {
                  e.preventDefault();
                  window.location.href = `/dm?userId=${stallProfile.id}`;
                }}
              >
                <MessageCircle className="w-5 h-5" />
                {t('dm.messages')}
              </a>
            )}
          </div>
          <ShareModal
            open={showShareModal}
            onClose={() => setShowShareModal(false)}
            shareUrl={getShareUrl()}
            getShareTitle={getShareTitle}
            t={t}
            handleCopyLink={handleCopyLink}
            handleNativeShare={handleNativeShare}
            handleShareWhatsApp={handleShareWhatsApp}
            handleShareTwitter={handleShareTwitter}
            handleShareFacebook={handleShareFacebook}
          />
        </motion.div>

        {/* 3D Marketplace Modal (focus on this stall) */}
        {show3DModal && (
          <MarketplaceStalls3D
            isOpen={show3DModal}
            onClose={() => setShow3DModal(false)}
            sellers={allSellers}
            onAddToCart={() => {}}
            onViewDetails={() => {}}
            focusSellerId={stallProfile.id}
          />
        )}

        {/* Products Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-[var(--text)]">
              {t('marketplace.title')} - {stallProfile.name}
            </h2>
            <span className="text-[var(--muted)]">
              {products.length} {products.length !== 1 ? t('product.relatedProducts').toLowerCase() : t('product.item', { defaultValue: 'item' })}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 card-glass rounded-xl">
              <Palette className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
              <p className="text-[var(--muted)] text-lg">{t('marketplace.noProducts')}</p>
              <p className="text-[var(--muted)]">{t('marketplace.noProductsDescription')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Link href={`/product/${product.id}`}>
                    <div className="relative h-48 bg-[var(--bg-2)] flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.title}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                          <span className="text-orange-400 text-4xl">🎨</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="font-semibold text-[var(--text)] mb-2 hover:text-orange-600 transition-colors">
                        {product.title}
                      </h3>
                    </Link>
                    
                    <p className="text-sm text-[var(--muted)] mb-2">{product.category}</p>
                    <p className="text-lg font-bold text-orange-600">₹{product.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Collaborative Products Section */}
        {collaborativeProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-12"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text)] flex items-center gap-2">
                  🤝 {t('collaboration.title')}
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {t('collaboration.subtitle')}
                </p>
              </div>
              <span className="text-[var(--muted)]">
                {collaborativeProducts.length} {collaborativeProducts.length !== 1 ? 'products' : 'product'}
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collaborativeProducts.map((collabProduct, index) => (
                <motion.div
                  key={collabProduct.product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-yellow-400/30"
                >
                  <Link href={`/product/${collabProduct.product.id}`}>
                    <div className="relative h-48 bg-[var(--bg-2)] flex items-center justify-center overflow-hidden">
                      {/* Collaboration Badge */}
                      <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        🤝 Collab
                      </div>
                      
                      {collabProduct.product.image_url ? (
                        <Image
                          src={collabProduct.product.image_url}
                          alt={collabProduct.product.title}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                          <span className="text-yellow-500 text-4xl">🎨</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/product/${collabProduct.product.id}`}>
                      <h3 className="font-semibold text-[var(--text)] mb-2 hover:text-orange-600 transition-colors">
                        {collabProduct.product.title}
                      </h3>
                    </Link>
                    
                    <p className="text-sm text-[var(--muted)] mb-2">{collabProduct.product.category}</p>
                    
                    {/* Partner Info */}
                    {collabProduct.partners.length > 0 && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-[var(--muted)] bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded">
                        <span className="font-medium">In collaboration with:</span>
                        {collabProduct.partners.map((partner, idx) => (
                          <span key={partner.id} className="text-yellow-700 dark:text-yellow-400 font-semibold">
                            {partner.name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-lg font-bold text-orange-600">₹{collabProduct.product.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Virtual Products Section */}
        {products.filter(p => p.is_virtual).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text)] flex items-center gap-2">
                  🧩 {t('product.virtualBadge')}
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {t('product.virtualProductManagement', { defaultValue: 'Explore digital, downloadable, or template-based products offered by this artisan.' })}
                </p>
              </div>
              <span className="text-[var(--muted)]">
                {products.filter(p => p.is_virtual).length} {products.filter(p => p.is_virtual).length !== 1 ? t('product.relatedProducts').toLowerCase() : t('product.item', { defaultValue: 'item' })}
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.filter(p => p.is_virtual).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-cyan-400/30"
                >
                  <Link href={`/product/${product.id}`}>
                    <div className="relative h-48 bg-[var(--bg-2)] flex items-center justify-center overflow-hidden">
                      {/* Virtual Product Badge */}
                      <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-cyan-400 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                        🧩 {t('product.virtualBadge')}
                      </div>
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.title}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                          <span className="text-cyan-500 text-4xl">🧩</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="font-semibold text-[var(--text)] mb-2 hover:text-orange-600 transition-colors">
                        {product.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-[var(--muted)] mb-2">{product.category}</p>
                    <p className="text-lg font-bold text-orange-600">₹{product.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* About the Artisan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 card-glass rounded-xl p-8"
        >
          <h3 className="text-2xl font-semibold text-[var(--text)] mb-4 text-center">
            {t('product.meetTheArtisan')}
          </h3>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[var(--muted)] leading-relaxed mb-6">
              {stallProfile.store_description || stallProfile.bio || 
                `${stallProfile.name} is a passionate artisan dedicated to creating unique, handcrafted pieces that celebrate tradition and craftsmanship. Each creation is made with care and attention to detail, ensuring that every piece tells a story and brings beauty to your life.`
              }
            </p>
            <div className="flex justify-center space-x-6 text-sm text-[var(--muted)]">
              <div className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                <span>{t('seller.overview', { defaultValue: 'Business Overview' })}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{t('product.artisanInfo')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Floating Message Button - only for logged-in users not viewing own stall */}
      {user && stallProfile && user.id !== stallProfile.id && (
        <button
          onClick={handleFloatingDM}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 via-green-500 to-teal-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 px-5 py-3 font-semibold"
          title={`Message ${stallProfile.name || 'User'}`}
        >
          <span className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            <span className="text-xs font-semibold">Message</span>
          </span>
        </button>
      )}
    </div>
  )
}
