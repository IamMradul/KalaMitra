'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, ArrowLeft, Package, Shield, Heart, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  getAnonymousCart,
  updateAnonymousCartQuantity,
  removeFromAnonymousCart,
  addToAnonymousCart,
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

type WishlistItem = {
  id: string
  title: string
  price: number
  image_url: string
  category: string
  product_id: string
  seller?: {
    name: string
  }
}

export default function CartPage() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    fetchCartItems()
    if (profile?.wishlist) {
      fetchWishlistItems()
    }
  }, [user, profile])

  const fetchWishlistItems = async () => {
    if (!profile?.wishlist || profile.wishlist.length === 0) {
      setWishlistItems([])
      return
    }
    setWishlistLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:profiles(name)')
        .in('id', profile.wishlist)

      if (error) throw error

      // Filter out items already in cart
      // We need to check both DB cart items and anonymous cart items ideally, 
      // but cartItems state covers what's currently displayed.
      // However, we need to wait for cartItems to be populated first or just do it in render.
      // For now just set all and we can disable button if in cart.
      setWishlistItems(data || [])
    } catch (error) {
      console.error('Error fetching wishlist for cart:', error)
    } finally {
      setWishlistLoading(false)
    }
  }

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
      
      // Dispatch custom event to immediately update cart count in navbar
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
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
      
      // Dispatch custom event to immediately update cart count in navbar
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      setFeedback(t('cart.removed'))
      await fetchCartItems()
    } catch (error) {
      setFeedback(t('cart.removeError'))
      // eslint-disable-next-line no-console
      console.error('Error removing item from cart:', error)
    }
    setActionLoading(null)
    setActionLoading(null)
  }

  const addToCartFromWishlist = async (product: CartItem | WishlistItem) => {
    setActionLoading(product.product_id)
    try {
      if (user) {
        // Check if already in cart
        const { data: existing } = await supabase
          .from('cart')
          .select('id, quantity')
          .eq('buyer_id', user.id)
          .eq('product_id', product.product_id)
          .single()

        if (existing) {
          // Update quantity
          const { error } = await supabase
            .from('cart')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id)
          if (error) throw error
        } else {
          // Insert new
          const { error } = await supabase
            .from('cart')
            .insert({
              buyer_id: user.id,
              product_id: product.product_id,
              quantity: 1
            })
          if (error) throw error
        }
      } else {
        // Anonymous
        addToAnonymousCart(product.product_id, 1)
      }
      
      // Dispatch custom event to immediately update cart count in navbar
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      setFeedback(t('cart.addedFromWishlist', { defaultValue: 'Added to cart' }))
      await fetchCartItems()
    } catch (error) {
      console.error('Error adding wishlist item to cart:', error)
      setFeedback(t('common.error'))
    } finally {
      setActionLoading(null)
    }
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
    <div className="min-h-screen heritage-bg py-10 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 indian-pattern opacity-5 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bx from-[var(--saffron)]/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[var(--maroon)]/10 to-transparent rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 border-b border-[var(--border)] pb-8"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <Link
                href="/marketplace"
                className="inline-flex items-center text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium mb-6 transition-colors group uppercase tracking-[0.2em]"
              >
                <ArrowLeft className="w-3 h-3 mr-2 group-hover:-translate-x-1 transition-transform" />
                {t('marketplace.backToMarketplace')}
              </Link>
              <h1 className="text-5xl font-light text-[var(--text)] tracking-tight">
                {t('cart.title')}
              </h1>
            </div>
            <div className="flex items-center gap-8 text-sm font-mono text-[var(--muted)] border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-8 mt-4 md:mt-0">
              <div>
                <span className="block text-[10px] uppercase tracking-wider mb-1">Date</span>
                <span className="text-[var(--text)]">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider mb-1">Order ID</span>
                <span className="text-[var(--text)]">#{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-[var(--bg-2)] border-l-4 border-[var(--heritage-gold)] text-[var(--text)] px-6 py-4 shadow-xl animate-fade-in flex items-center gap-4">
            <div className="w-2 h-2 bg-[var(--heritage-gold)]"></div>
            <span className="font-mono text-sm uppercase tracking-wide">{feedback}</span>
            <button className="ml-2 text-[var(--muted)] hover:text-[var(--text)]" onClick={() => setFeedback(null)} aria-label="Close">×</button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center py-24 bg-[var(--bg-2)] border border-[var(--border)] flex flex-col items-center justify-center max-w-2xl mx-auto"
          >
            <div className="mb-6">
              <ShoppingCart className="w-16 h-16 text-[var(--muted)] stroke-1" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-3 font-serif uppercase tracking-widest">
              {t('cart.empty')}
            </h2>
            <p className="text-[var(--muted)] mb-8 max-w-md mx-auto text-sm font-mono">
              {t('cart.emptyDescription')}
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center px-8 py-4 bg-[var(--text)] text-[var(--bg-1)] font-bold uppercase tracking-widest hover:bg-[var(--heritage-gold)] transition-colors duration-300"
            >
              {t('marketplace.browseProducts')}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="bg-[var(--bg-2)] border border-[var(--border)]">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 p-6 border-b border-[var(--border)] text-xs uppercase tracking-widest text-[var(--muted)] font-medium">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {cartItems.map((item, index) => {
                    const itemId = 'id' in item ? item.id : item.product_id
                    return (
                      <motion.div
                        key={itemId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="group p-6 hover:bg-[var(--bg-1)]/50 transition-colors"
                      >
                        <div className="flex flex-col sm:grid sm:grid-cols-12 gap-6 items-center">

                          {/* Product Info (Col 6) */}
                          <div className="w-full sm:col-span-6 flex gap-6 items-center">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--bg-3)] flex-shrink-0 border border-[var(--border)] relative overflow-hidden">
                              {item.product.image_url ? (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.title}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">NO IMG</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-medium text-[var(--text)] mb-1 truncate pr-4">
                                {item.product.title}
                              </h3>
                              <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-3">
                                {item.product.category}
                              </p>
                              <button
                                onClick={() => removeFromCart(item)}
                                disabled={!!actionLoading}
                                className="text-xs text-[var(--muted)] hover:text-red-500 transition-colors flex items-center gap-1 group/delete"
                              >
                                <span className="w-4 h-px bg-[var(--muted)] group-hover/delete:bg-red-500 transition-colors"></span>
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Price (Col 2) */}
                          <div className="w-full sm:col-span-2 text-center font-mono text-sm text-[var(--muted)]">
                            <span className="sm:hidden mr-2 uppercase text-xs tracking-wide">Price:</span>
                            ₹{item.product.price.toLocaleString()}
                          </div>

                          {/* Quantity (Col 2) */}
                          <div className="w-full sm:col-span-2 flex justify-center">
                            <div className="flex items-center border border-[var(--border)] bg-[var(--bg-1)] h-8">
                              <button
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={actionLoading === itemId}
                                className="w-8 h-full flex items-center justify-center hover:bg-[var(--bg-3)] transition-colors text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
                              >
                                -
                              </button>
                              <span className="w-8 h-full flex items-center justify-center font-mono text-sm border-x border-[var(--border)] bg-transparent">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                                disabled={actionLoading === itemId}
                                className="w-8 h-full flex items-center justify-center hover:bg-[var(--bg-3)] transition-colors text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Total (Col 2) */}
                          <div className="w-full sm:col-span-2 text-right font-medium text-[var(--text)]">
                            <span className="sm:hidden mr-2 uppercase text-xs tracking-wide text-[var(--muted)]">Total:</span>
                            ₹{(item.product.price * item.quantity).toLocaleString()}
                          </div>

                        </div>
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
              <div className="bg-[var(--bg-2)] border border-[var(--border)] p-8 sticky top-24">
                <h2 className="text-sm font-bold text-[var(--text)] mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[var(--heritage-gold)]"></span>
                  {t('cart.orderSummary')}
                </h2>

                <div className="space-y-4 mb-8 text-sm">
                  <div className="flex justify-between items-center text-[var(--muted)]">
                    <span className="font-medium">Subtotal</span>
                    <span className="text-[var(--text)] font-mono">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--muted)]">
                    <span className="font-medium">Shipping</span>
                    <span className="text-green-600 font-mono text-xs uppercase bg-green-50 dark:bg-green-900/10 px-2 py-0.5 tracking-wide">Free</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--muted)]">
                    <span className="font-medium">Tax</span>
                    <span className="text-[var(--text)] font-mono">₹0</span>
                  </div>

                  <div className="h-px bg-[var(--border)] my-6"></div>

                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-[var(--text)] uppercase tracking-widest">{t('cart.total')}</span>
                    <span className="text-3xl font-light text-[var(--text)] leading-none">
                      ₹{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setCheckoutLoading(true)
                    setFeedback(t('cart.checkoutComingSoon'))
                    setTimeout(() => setCheckoutLoading(false), 1200)
                  }}
                  disabled={cartItems.length === 0 || checkoutLoading}
                  className={`
                    w-full py-4 px-6 font-medium text-xs uppercase tracking-[0.25em] transition-all duration-300
                    ${cartItems.length === 0 || checkoutLoading
                      ? 'bg-[var(--bg-3)] text-[var(--muted)] cursor-not-allowed border border-[var(--border)]'
                      : 'bg-[var(--text)] text-[var(--bg-1)] hover:bg-[var(--heritage-gold)] hover:text-white border border-[var(--text)] hover:border-[var(--heritage-gold)]'
                    }
                  `}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 border border-current border-t-transparent rounded-full"
                      />
                      Processing...
                    </span>
                  ) : (
                    t('cart.checkout')
                  )}
                </button>

                <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">We Accept</p>
                  <div className="flex justify-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Placeholders for payment icons */}
                    <div className="w-8 h-5 bg-[var(--text)]/10 rounded-sm"></div>
                    <div className="w-8 h-5 bg-[var(--text)]/10 rounded-sm"></div>
                    <div className="w-8 h-5 bg-[var(--text)]/10 rounded-sm"></div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[var(--muted)] uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    <span>Secure SSL Encryption</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Wishlist Section */}
        {wishlistItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 pt-16 border-t border-[var(--border)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <Heart className="w-5 h-5 text-[var(--heritage-red)] fill-current" />
              <h2 className="text-xl font-bold uppercase tracking-widest">{t('cart.savedForLater', { defaultValue: 'Saved For Later' })}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistItems.map((item) => {
                const isInCart = cartItems.some(c => {
                  const cId = 'id' in c ? c.product_id : c.product_id
                  return cId === item.product_id
                })

                return (
                  <div key={item.id} className="group bg-[var(--bg-2)] border border-[var(--border)] p-4 flex flex-col">
                    <Link href={`/product/${item.product_id}`} className="block relative aspect-square bg-[var(--bg-3)] mb-4 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">NO IMG</div>
                      )}
                    </Link>
                    <Link href={`/product/${item.product_id}`} className="block">
                      <h3 className="font-medium text-sm truncate mb-1 hover:text-[var(--heritage-gold)] transition-colors">{item.title}</h3>
                    </Link>
                    <p className="text-[var(--muted)] text-xs mb-3 truncate">{item.seller?.name}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-mono text-sm">₹{item.price.toLocaleString()}</span>
                      <button
                        onClick={() => addToCartFromWishlist(item)}
                        disabled={!!actionLoading}
                        className="p-2 border border-[var(--border)] hover:bg-[var(--text)] hover:text-[var(--bg-1)] transition-colors disabled:opacity-50"
                        title={isInCart ? 'Add another' : 'Add to Cart'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
