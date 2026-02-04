'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, Trash2, ArrowLeft, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Database } from '@/lib/supabase'

type Product = Database['public']['Tables']['products']['Row'] & {
    seller: {
        name: string
    }
}

export default function WishlistPage() {
    const { t } = useTranslation()
    const { user, profile, loading } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        if (user && profile?.wishlist) {
            fetchWishlistItems()
        } else if (!loading && !user) {
            setFetching(false)
        } else if (profile && (!profile.wishlist || profile.wishlist.length === 0)) {
            setProducts([])
            setFetching(false)
        }
    }, [user, profile, loading])

    const fetchWishlistItems = async () => {
        if (!profile?.wishlist || profile.wishlist.length === 0) {
            setProducts([])
            setFetching(false)
            return
        }

        try {
            setFetching(true)
            // profile.wishlist is array of product IDs
            // Clean up array in case of nulls if schema wasn't perfect, but typescript says string[] | null
            const ids = profile.wishlist
            console.log('Fetching wishlist with IDs:', ids)

            const { data, error } = await supabase
                .from('products')
                .select('*, seller:profiles(name)')
                .in('id', ids)

            if (error) {
                console.error('Supabase error fetching wishlist products:', error)
                throw error
            }
            console.log('Fetched wishlist products:', data)
            setProducts(data || [])
        } catch (error) {
            console.error('Error fetching wishlist:', error)
        } finally {
            setFetching(false)
        }
    }

    const removeFromWishlist = async (productId: string) => {
        if (!user || !profile?.wishlist) return

        const newWishlist = profile.wishlist.filter(id => id !== productId)

        // Optimistic update
        setProducts(prev => prev.filter(p => p.id !== productId))

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ wishlist: newWishlist })
                .eq('id', user.id)

            if (error) throw error

            // Force auth context update would be ideal here if we had a easy way, 
            // but usually profile updates propagate or we rely on local state until refresh.
            // For now we assume local state matches DB.
        } catch (error) {
            console.error('Error removing from wishlist:', error)
            alert(t('common.error'))
            fetchWishlistItems() // Revert
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-1)] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <Link href="/marketplace" className="inline-flex items-center text-sm text-[var(--muted)] hover:text-[var(--heritage-gold)] mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {t('marketplace.backToMarketplace')}
                        </Link>
                        <h1 className="text-3xl font-bold text-[var(--text)] heritage-title">
                            {t('profile.wishlist')}
                        </h1>
                    </div>
                    <div className="text-[var(--muted)] font-mono text-sm">
                        {products.length} {products.length === 1 ? t('common.item') : t('common.items')}
                    </div>
                </div>

                {fetching ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-80 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-24 bg-[var(--bg-2)] rounded-3xl border border-dashed border-[var(--border)]">
                        <Heart className="w-16 h-16 text-[var(--muted)] mx-auto mb-4 opacity-50" />
                        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">{t('wishlist.emptyTitle') || 'Your wishlist is empty'}</h2>
                        <p className="text-[var(--muted)] mb-8 max-w-md mx-auto">{t('wishlist.emptyDescription') || 'Explore our marketplace and collect unique treasures you love.'}</p>
                        <Link href="/marketplace" className="px-8 py-3 bg-[var(--heritage-gold)] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[var(--heritage-red)] transition-all">
                            {t('marketplace.browse')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group bg-[var(--bg-2)] rounded-2xl overflow-hidden border border-[var(--border)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="relative aspect-square bg-[var(--bg-3)] overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">NO IMG</div>
                                    )}

                                    {/* Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <Link href={`/product/${product.id}`} className="p-3 bg-white text-gray-900 rounded-full shadow-lg hover:scale-110 transition-transform" title={t('common.view')}>
                                            <Search className="w-5 h-5" />
                                        </Link>
                                        <button
                                            onClick={() => removeFromWishlist(product.id)}
                                            className="p-3 bg-white text-red-500 rounded-full shadow-lg hover:scale-110 transition-transform"
                                            title={t('common.remove')}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-5">
                                    <div className="mb-2">
                                        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">{product.category}</p>
                                        <Link href={`/product/${product.id}`}>
                                            <h3 className="font-bold text-[var(--text)] truncate hover:text-[var(--heritage-gold)] transition-colors">{product.title}</h3>
                                        </Link>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-bold text-[var(--heritage-gold)]">₹{product.price.toLocaleString()}</p>
                                        <p className="text-xs text-[var(--muted)] truncate max-w-[50%] opacity-0 group-hover:opacity-100 transition-opacity">
                                            {product.seller?.name}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}
