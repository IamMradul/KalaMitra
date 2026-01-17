'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, ArrowLeft, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { 
  getAnonymousCart, 
  updateAnonymousCartQuantity, 
  removeFromAnonymousCart,
  clearAnonymousCart 
} from '@/utils/cart'

type DatabaseCartItem = Database['public']['Tables']['cart']['Row'] & {
  product: {
    title: string
    price: number
    image_url: string
    category: string
  }
  product_id: string // Explicitly include product_id for type narrowing
}

type AnonymousCartItem = {
  product_id: string
  quantity: number
  product: {
    title: string
    price: number
    image_url: string
    category: string
  }
}

type CartItem = (DatabaseCartItem | AnonymousCartItem) & { 
  isAnonymous?: boolean 
}

export default function CartPage() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    fetchCartItems()
  }, [user, profile])

  const fetchCartItems = async () => {
    if (user) {
      // Fetch from database for logged-in users
      try {
        const { data, error } = await supabase
          .from('cart')
          .select(`
            *,
            product:products(title, price, image_url, category)
          `)
          .eq('buyer_id', user.id)
        if (error) throw error
        setCartItems((data || []) as CartItem[])
      } catch (error) {
        console.error('Error fetching cart items:', error)
      }
    } else {
      // Fetch from localStorage for anonymous users
      const anonymousCart = getAnonymousCart()
      // Fetch product details for each cart item
      const itemsWithProducts = await Promise.all(
        anonymousCart.map(async (item): Promise<CartItem | null> => {
          try {
            const { data: product, error } = await supabase
              .from('products')
              .select('title, price, image_url, category')
              .eq('id', item.product_id)
              .single()
            
            if (error || !product) {
              console.error('Error fetching product:', error)
              return null
            }
            
            return {
              ...item,
              product,
              isAnonymous: true
            } as CartItem
          } catch (error) {
            console.error('Error fetching product details:', error)
            return null
          }
        })
      )
      
      // Filter out null items (products that couldn't be fetched)
      setCartItems(itemsWithProducts.filter((item): item is CartItem => item !== null))
    }
    setLoading(false)
  }

  const updateQuantity = async (item: CartItem, newQuantity: number) => {
    const itemId = 'id' in item ? item.id : item.product_id
    setActionLoading(itemId)
    
    if (newQuantity <= 0) {
      await removeFromCart(item)
      setActionLoading(null)
      return
    }
    
    try {
      if (user && !item.isAnonymous && 'id' in item) {
        // Update in database for logged-in users
        const { error } = await supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('id', item.id)
        if (error) throw error
      } else {
        // Update in localStorage for anonymous users
        const productId = item.product_id
        updateAnonymousCartQuantity(productId, newQuantity)
      }
      setFeedback(t('cart.quantityUpdated'))
      await fetchCartItems()
    } catch (error) {
      setFeedback(t('cart.updateError'))
      console.error('Error updating quantity:', error)
    }
    setActionLoading(null)
  }

  const removeFromCart = async (item: CartItem) => {
    const itemId = 'id' in item ? item.id : item.product_id
    setActionLoading(itemId)
    
    try {
      if (user && !item.isAnonymous && 'id' in item) {
        // Remove from database for logged-in users
        const { error } = await supabase
          .from('cart')
          .delete()
          .eq('id', item.id)
        if (error) throw error
      } else {
        // Remove from localStorage for anonymous users
        const productId = item.product_id
        removeFromAnonymousCart(productId)
      }
      setFeedback(t('cart.removed'))
      await fetchCartItems()
    } catch (error) {
      setFeedback(t('cart.removeError'))
      // eslint-disable-next-line no-console
      console.error('Error removing item from cart:', error)
    }
    setActionLoading(null)
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity)
    }, 0)
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full"
        />
        <span className="ml-4 text-orange-600 font-medium animate-pulse">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen heritage-bg py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4">
            <Link
              href="/marketplace"
              className="inline-flex items-center text-[var(--heritage-gold)] hover:text-[var(--heritage-red)] font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('marketplace.backToMarketplace')}
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold heritage-title mb-2">
            {t('cart.title')}
          </h1>
          <p className="text-base sm:text-lg text-[var(--heritage-brown)]">
            {t('cart.reviewSelectedItems')}
          </p>
        </motion.div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-orange-100 border border-orange-300 text-orange-800 px-6 py-3 rounded-xl shadow-lg animate-fade-in">
            {feedback}
            <button className="ml-4 text-orange-500 font-bold" onClick={() => setFeedback(null)} aria-label="Close">×</button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center py-12 sm:py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-orange-200 flex flex-col items-center justify-center"
          >
            <img src="/empty-cart-illustration.svg" alt="Empty cart" className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {t('cart.empty')}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {t('cart.emptyDescription')}
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200"
            >
              <Package className="w-5 h-5 mr-2" />
              {t('marketplace.browseProducts')}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Cart Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-orange-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  {t('cart.items')} ({cartItems.length})
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {cartItems.map((item) => {
                    const itemId = 'id' in item ? item.id : item.product_id
                    return (
                      <motion.div
                        key={itemId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg"
                      >
                        {/* Product Image */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                              <span className="text-orange-400 text-xl sm:text-2xl">🎨</span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {item.product.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">{item.product.category}</p>
                          <p className="text-base sm:text-lg font-bold text-orange-600">
                            ₹{item.product.price}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-0">
                          <button
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors ${actionLoading === itemId ? 'opacity-60 cursor-wait' : ''}`}
                            aria-label={t('cart.decreaseQuantity')}
                            disabled={actionLoading === itemId}
                          >
                            -
                          </button>
                          <span className="w-10 sm:w-12 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors ${actionLoading === itemId ? 'opacity-60 cursor-wait' : ''}`}
                            aria-label={t('cart.increaseQuantity')}
                            disabled={actionLoading === itemId}
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item)}
                          className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${actionLoading === itemId ? 'opacity-60 cursor-wait' : ''}`}
                          title={t('cart.remove')}
                          aria-label={t('cart.remove')}
                          disabled={actionLoading === itemId}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-orange-200 sticky top-4 sm:top-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  {t('cart.orderSummary')}
                </h2>
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('cart.subtotal')}</span>
                    <span className="font-medium">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('cart.shipping')}</span>
                    <span className="font-medium text-green-600">{t('cart.free')}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 sm:pt-4">
                    <div className="flex justify-between">
                      <span className="text-base sm:text-lg font-semibold text-gray-900">{t('cart.total')}</span>
                      <span className="text-xl sm:text-2xl font-bold text-orange-600">
                        ₹{calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setCheckoutLoading(true)
                    setFeedback(t('cart.checkoutComingSoon'))
                    setTimeout(() => setCheckoutLoading(false), 1200)
                  }}
                  disabled={cartItems.length === 0 || checkoutLoading}
                  className={`w-full px-4 py-2 sm:px-6 sm:py-3 font-semibold rounded-lg transition-all duration-200 ${cartItems.length === 0 || checkoutLoading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'}`}
                  aria-label={t('cart.checkout')}
                >
                  {checkoutLoading ? t('common.loading') : t('cart.checkout')}
                </button>

                <p className="text-xs text-gray-500 text-center mt-2 sm:mt-3">
                  {t('cart.secureCheckout')}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
