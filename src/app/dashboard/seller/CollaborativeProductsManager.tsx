'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Package, Plus, X, Loader2, Users, TrendingUp, DollarSign } from 'lucide-react'
import Image from 'next/image'
import { supabase, Database } from '@/lib/supabase'
import RevenueSplitManager from './RevenueSplitManager'

interface CollaborativeProductsManagerProps {
  collaborationId: string
  userId: string
  partnerName: string
  onClose: () => void
}

type Product = {
  id: string
  title: string
  price: number
  image_url: string | null
  category: string
}

type CollaborativeProduct = {
  id: string
  product: Product
  contribution_details: string | null
  revenue_split_override: {
    initiator: number
    partner: number
  } | null
  created_at: string
}

export default function CollaborativeProductsManager({
  collaborationId,
  userId,
  partnerName,
  onClose
}: CollaborativeProductsManagerProps) {
  const { t } = useTranslation()
  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [collaborativeProducts, setCollaborativeProducts] = useState<CollaborativeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [contributionDetails, setContributionDetails] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showSplitManager, setShowSplitManager] = useState<{
    collaborativeProductId: string
    productTitle: string
    currentSplit: { initiator: number, partner: number } | null
  } | null>(null)
  const [isInitiator, setIsInitiator] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchData()
  }, [collaborationId, userId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch collaboration details to determine if user is initiator
      const { data: collaboration } = await supabase
        .from('collaborations')
        .select('initiator_id, partner_id')
        .eq('id', collaborationId)
        .single()

      type CollabSimple = { initiator_id?: string | null; partner_id?: string | null } | null
      const collabSimple = collaboration as CollabSimple
      if (collabSimple) {
        setIsInitiator(collabSimple.initiator_id === userId)
      }

      // Fetch user's products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price, image_url, category')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })

      setMyProducts((products as Product[]) || [])

      // Fetch collaborative products with revenue split
      const { data: collabProducts } = await supabase
        .from('collaborative_products')
        .select(`
          id,
          contribution_details,
          revenue_split_override,
          created_at,
          product:products(id, title, price, image_url, category)
        `)
        .eq('collaboration_id', collaborationId)

      const typedCollabProducts = collabProducts as CollaborativeProduct[] | null
      setCollaborativeProducts(typedCollabProducts || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      alert('Please select a product')
      return
    }

    try {
      setActionLoading('add')
      
      const response = await fetch('/api/collaboration/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborationId,
          productId: selectedProduct,
          primarySellerId: userId,
          contributionDetails: contributionDetails || null
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(t('collaboration.productAdded') || 'Product added to collaboration successfully!')
        setShowAddProduct(false)
        setSelectedProduct('')
        setContributionDetails('')
        await fetchData()
      } else {
        alert(data.error || 'Failed to add product')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product to collaboration')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm(t('collaboration.confirmRemoveProduct') || 'Are you sure you want to remove this product from the collaboration?')) {
      return
    }

    try {
      setActionLoading(productId)

      const response = await fetch(
        `/api/collaboration/products?productId=${productId}&userId=${userId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (data.success) {
        alert(t('collaboration.productRemoved') || 'Product removed from collaboration')
        await fetchData()
      } else {
        alert(data.error || 'Failed to remove product')
      }
    } catch (error) {
      console.error('Error removing product:', error)
      alert('Failed to remove product')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter out products already in collaboration
  const availableProducts = myProducts.filter(
    p => !collaborativeProducts.some(cp => cp.product.id === p.id)
  )

  if (!mounted) {
    return null
  }

  const modalContent = loading ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="h-6 w-6" />
              {t('collaboration.manageProducts') || 'Manage Collaborative Products'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('collaboration.collaborationWith', { name: partnerName })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">Collaborative Products</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {collaborativeProducts.length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">Your Available Products</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {availableProducts.length}
            </div>
          </div>
        </div>

        {/* Add Product Button */}
        {!showAddProduct && availableProducts.length > 0 && (
          <button
            onClick={() => setShowAddProduct(true)}
            className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            {t('collaboration.addProduct') || 'Add Product to Collaboration'}
          </button>
        )}

        {/* Add Product Form */}
        <AnimatePresence>
          {showAddProduct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('collaboration.selectProduct')}
              </h3>
              
              <div className="space-y-4">
                {/* Product Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.product')}
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">{t('collaboration.selectProduct')}</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} (₹{product.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contribution Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('collaboration.contributionDetails') }
                  </label>
                  <textarea
                    value={contributionDetails}
                    onChange={(e) => setContributionDetails(e.target.value)}
                    placeholder="E.g., I designed the pattern, partner crafts the piece..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProduct}
                    disabled={!selectedProduct || actionLoading === 'add'}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'add' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.adding') || 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {t('common.add') || 'Add'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProduct(false)
                      setSelectedProduct('')
                      setContributionDetails('')
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    {t('common.cancel') || 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collaborative Products List */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('collaboration.currentProducts') || 'Current Collaborative Products'}
          </h3>

          {collaborativeProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('collaboration.noProductsYet') || 'No collaborative products yet'}</p>
              <p className="text-sm mt-1">
                {t('collaboration.addFirstProduct') || 'Add your first product to start collaborating!'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <AnimatePresence>
                {collaborativeProducts.map((collabProduct) => (
                  <motion.div
                    key={collabProduct.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {collabProduct.product.image_url ? (
                          <Image
                            src={collabProduct.product.image_url}
                            alt={collabProduct.product.title}
                            width={80}
                            height={80}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 flex items-center justify-center">
                            <Package className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {collabProduct.product.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {collabProduct.product.category}
                        </p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                          ₹{collabProduct.product.price}
                        </p>
                        
                        {collabProduct.contribution_details && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                            {collabProduct.contribution_details}
                          </p>
                        )}

                        {/* Revenue Split Display */}
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Split: {collabProduct.revenue_split_override?.initiator || 50}% / {collabProduct.revenue_split_override?.partner || 50}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => setShowSplitManager({
                          collaborativeProductId: collabProduct.id,
                          productTitle: collabProduct.product.title,
                          currentSplit: collabProduct.revenue_split_override
                        })}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:from-yellow-200 hover:to-orange-200 dark:hover:from-yellow-900/50 dark:hover:to-orange-900/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <DollarSign className="h-4 w-4" />
                        Manage Split
                      </button>
                      <button
                        onClick={() => handleRemoveProduct(collabProduct.product.id)}
                        disabled={actionLoading === collabProduct.product.id}
                        className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      >
                            {actionLoading === collabProduct.product.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('collaboration.removingProduct') || 'Removing...'}
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4" />
                            {t('collaboration.removeProduct') || 'Remove from Collaboration'}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </motion.div>

      {/* Revenue Split Manager Modal */}
      {showSplitManager && (
        <RevenueSplitManager
          collaborativeProductId={showSplitManager.collaborativeProductId}
          collaborationId={collaborationId}
          productTitle={showSplitManager.productTitle}
          currentSplit={showSplitManager.currentSplit}
          isInitiator={isInitiator}
          partnerName={partnerName}
          userId={userId}
          onClose={() => {
            setShowSplitManager(null)
            fetchData() // Refresh to show updated splits
          }}
        />
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
