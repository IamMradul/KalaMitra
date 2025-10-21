 'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { Edit, Trash2, Eye, Palette, LogOut, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { extractImageFeatures } from '@/lib/image-similarity'
import AIProductForm from '@/components/AIProductForm'
import SellerAnalytics from './SellerAnalytics'
import ProfileManager from './ProfileManager'
import SellerAuctionsList from './SellerAuctionsList'
import CollaborationManager from './CollaborationManager'
import StallCustomizationModal, { StallCustomizationSettings } from '@/components/StallCustomizationModal'

type Product = Database['public']['Tables']['products']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function SellerDashboard() {
  const { user, profile, loading, signOut } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [showAIProductForm, setShowAIProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showStallCustomization, setShowStallCustomization] = useState(false)
  const [stallCustomizationSettings, setStallCustomizationSettings] = useState<StallCustomizationSettings | undefined>(undefined)
  const [stallCustomizationLoading, setStallCustomizationLoading] = useState(false);
  // Load stall customization from Supabase when modal opens
  useEffect(() => {
    const fetchStallCustomization = async () => {
      if (!user || !showStallCustomization) return;
      setStallCustomizationLoading(true);
      try {
        const { data, error } = await supabase
          .from('stall_customizations')
          .select('*')
          .eq('seller_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
          console.error('Error fetching stall customization:', error);
        }
        if (data) {
          setStallCustomizationSettings({
            stall_theme: data.stall_theme || 'classic',
            welcome_message: data.welcome_message || '',
            decor: data.decor || {},
            featured_product_ids: data.featured_product_ids || [],
          });
        } else {
          setStallCustomizationSettings(undefined);
        }
      } catch (err) {
        console.error('Error loading stall customization:', err);
        setStallCustomizationSettings(undefined);
      } finally {
        setStallCustomizationLoading(false);
      }
    };
    if (showStallCustomization) {
      fetchStallCustomization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStallCustomization, user]);
  const [stallProfile, setStallProfile] = useState<Profile | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [addProductLoading, setAddProductLoading] = useState(false)
  const [editProductLoading, setEditProductLoading] = useState(false)
  const [dbStatus, setDbStatus] = useState<string>('Unknown')
  const [isTestingDb, setIsTestingDb] = useState(false)
  const [activeSection, setActiveSection] = useState<'products' | 'analytics' | 'collaborations'>('products')
  const hasInitialized = useRef(false)
  const dbTestedRef = useRef(false)
  const productsFetchedRef = useRef(false)

  const testDatabaseConnection = async () => {
    // Prevent multiple simultaneous database tests
    if (isTestingDb || dbStatus !== 'Unknown' || dbTestedRef.current) {
      console.log('Database test already in progress or completed, skipping...')
      return
    }

    // If we have a stored session and a previous successful DB test for this user, skip retesting
    try {
      const storedSessionRaw = localStorage.getItem('km_session_json')
      const testedUserId = localStorage.getItem('km_db_test_user')
      const testedDone = localStorage.getItem('km_db_test_done')
      if (storedSessionRaw && testedDone === 'true' && testedUserId && user?.id && testedUserId === user.id) {
        console.log('Skipping DB test: found prior success for this user in localStorage')
        dbTestedRef.current = true
        setDbStatus(localStorage.getItem('km_db_status') || 'Connected - All tables accessible')
        return
      }
    } catch {}

    setIsTestingDb(true)
    try {
      console.log('Testing database connection...')
      
      // Test profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (profilesError) {
        console.error('Profiles table error:', profilesError)
        setDbStatus(`Profiles table error: ${profilesError.message}`)
        return
      }
      
      // Test products table
      const { error: productsError } = await supabase
        .from('products')
        .select('count')
        .limit(1)
      
      if (productsError) {
        console.error('Products table error:', productsError)
        setDbStatus(`Products table error: ${productsError.message}`)
        return
      }
      
      console.log('Database connection successful')
      setDbStatus('Connected - All tables accessible')
      dbTestedRef.current = true
      try {
        if (user?.id) {
          localStorage.setItem('km_db_test_user', user.id)
          localStorage.setItem('km_db_test_done', 'true')
          localStorage.setItem('km_db_status', 'Connected - All tables accessible')
          localStorage.setItem('km_db_tested_at', Date.now().toString())
        }
      } catch {}
    } catch (error) {
      console.error('Database connection test failed:', error)
      setDbStatus(`Connection failed: ${error}`)
      dbTestedRef.current = true
      try {
        if (user?.id) {
          localStorage.setItem('km_db_test_user', user.id)
          localStorage.setItem('km_db_test_done', 'true')
          localStorage.setItem('km_db_status', `Connection failed`)
          localStorage.setItem('km_db_tested_at', Date.now().toString())
        }
      } catch {}
    } finally {
      setIsTestingDb(false)
    }
  }

  useEffect(() => {
    console.log('Dashboard useEffect - loading:', loading, 'user:', !!user, 'profile:', !!profile)
    
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to signin')
        router.push('/auth/signin')
      } else if (profile?.role !== 'seller') {
        console.log('User is not seller, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('User is seller, fetching products and setting stall profile')
        setStallProfile(profile)
        // Only fetch products if not already fetched
        if (!productsFetchedRef.current) {
          fetchProducts()
        } else {
          console.log('Products already fetched, skipping...')
        }
        
        // Only test database connection once per session/user
        if (!hasInitialized.current && dbStatus === 'Unknown' && !dbTestedRef.current) {
          testDatabaseConnection()
          hasInitialized.current = true
        }
      }
    }

    // Cleanup function to reset loading states when component unmounts
    return () => {
      setProductsLoading(false)
      setAddProductLoading(false)
      setEditProductLoading(false)
    }
  }, [user, profile, loading, router, dbStatus])

  // Remove the problematic useEffect that causes infinite loops

  const fetchProducts = async () => {
    if (!user) return
    
    // Prevent multiple simultaneous executions
    if (productsLoading) {
      console.log('Products fetch already in progress, skipping...')
      return
    }

    setProductsLoading(true)
    try {
      console.log('Fetching products for user:', user.id)
      
      // Test basic Supabase connection first
      console.log('Testing basic Supabase connection...')
      try {
        const { data: testData, error: testError } = await supabase
          .from('products')
          .select('count')
          .limit(1)
        
        if (testError) {
          console.error('Basic connection test failed:', testError)
          throw testError
        }
        console.log('Basic connection test successful')
      } catch (testErr) {
        console.error('Basic connection test error:', testErr)
        throw testErr
      }
      
      // Test simple query without user filter first
      console.log('Testing simple products query...')
      try {
        const { data: simpleData, error: simpleError } = await supabase
          .from('products')
          .select('id, title')
          .limit(5)
        
        if (simpleError) {
          console.error('Simple query failed:', simpleError)
          throw simpleError
        }
        console.log('Simple query successful, found:', simpleData?.length || 0, 'products')
      } catch (simpleErr) {
        console.error('Simple query error:', simpleErr)
        throw simpleErr
      }
      
      // Now try the actual user-specific query
      console.log('Testing user-specific query...')
      const fetchPromise = supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      
      console.log('Supabase query created, awaiting response...')
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Products fetch timeout after 10 seconds')), 10000)
      })
      
      console.log('Starting race between fetch and timeout...')
      const raced = await Promise.race([fetchPromise, timeoutPromise])
      console.log('Race completed, processing result...')
      const { data, error } = raced as { data: Product[] | null; error: { message: string; details?: string; hint?: string; code?: string } | null }

      if (error) {
        console.error('Error fetching products:', error)
        throw error
      }
      
      console.log('Products fetched successfully:', data?.length || 0, 'products')
      setProducts(data || [])
      productsFetchedRef.current = true
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      productsFetchedRef.current = true
    } finally {
      setProductsLoading(false)
    }
  }

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setStallProfile(updatedProfile)
  }

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) {
      alert('User not authenticated')
      return
    }

    // Prevent multiple simultaneous operations
    if (addProductLoading) {
      console.log('Add product operation already in progress, skipping...')
      return
    }

    setAddProductLoading(true)
    
  const formData = new FormData(e.currentTarget)
  const title = formData.get('title') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const imageUrl = formData.get('imageUrl') as string
  const product_story = formData.get('product_story') as string | null

    // Basic validation
    if (!title || !category || !description || isNaN(price) || price <= 0) {
      alert('Please fill in all required fields with valid values.')
      setAddProductLoading(false)
      return
    }

    try {
      console.log('=== ADDING PRODUCT ===')
      console.log('User ID:', user.id)
      console.log('User email:', user.email)
      console.log('Profile role:', profile?.role)
      console.log('User authenticated:', !!user)
      console.log('Profile exists:', !!profile)
  console.log('Product data:', { title, category, description, price, imageUrl, product_story })
      
      // Extract image features (best-effort)
      let features: { avgColor: { r: number; g: number; b: number }; aHash: string } | null = null
      if (imageUrl) {
        try {
          features = await extractImageFeatures(imageUrl)
        } catch {}
      }
      console.log('Proceeding with insert...')
      console.log('Insert data:', {
        seller_id: user.id,
        title,
        category,
        description,
        price,
        image_url: imageUrl || null,
        product_story: product_story || null,
      })
      
      // Add timeout to prevent hanging
      const insertPromise = supabase
        .from('products')
        .insert([
          {
            seller_id: user.id,
            title,
            category,
            description,
            price,
            image_url: imageUrl || null,
            product_story: product_story || null,
            // New optional columns if present in DB
            image_avg_r: features?.avgColor.r ?? null,
            image_avg_g: features?.avgColor.g ?? null,
            image_avg_b: features?.avgColor.b ?? null,
            image_ahash: features?.aHash ?? null,
          },
        ])
        .select()
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database insert timeout after 10 seconds')), 10000)
      })
      
      const raced = await Promise.race([insertPromise, timeoutPromise])
      const { data, error } = raced as { data: Product[] | null; error: { message: string; details?: string; hint?: string; code?: string } | null }

      if (error) {
        console.error('Error adding product:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Provide specific error messages based on error type
        if (error.code === '23503') {
          alert('Foreign key constraint failed. Your profile may not exist in the database.')
        } else if (error.code === '42P01') {
          alert('Products table does not exist. Please run the database setup SQL.')
        } else if (error.code === '42501') {
          alert('Permission denied. Check your Row Level Security policies.')
        } else {
          alert(`Failed to add product: ${error.message}`)
        }
        throw error
      }

      console.log('Product added successfully:', data)
      alert('Product added successfully!')
      // Reset form safely before closing modal
      const formElement = (e.currentTarget as HTMLFormElement | null)
      if (formElement && typeof formElement.reset === 'function') {
        formElement.reset()
      }
      fetchProducts()
      // Return new product ID for AIProductForm
      return data && data[0] && data[0].id ? data[0].id : null;
    } catch (error) {
      console.error('Error adding product:', error)
      if (error instanceof Error) {
        alert(`Failed to add product: ${error.message}`)
      } else {
        alert('Failed to add product. Please try again.')
      }
      return null;
    } finally {
      setAddProductLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleEditProduct = async (productId: string, formData: FormData) => {
    if (!user) return

    setEditProductLoading(true)
    
  const title = formData.get('title') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const imageUrl = formData.get('imageUrl') as string
  const product_story = formData.get('product_story') as string | null

    // Basic validation
    if (!title || !category || !description || isNaN(price) || price <= 0) {
      alert('Please fill in all required fields with valid values.')
      setEditProductLoading(false)
      return
    }

    try {
      console.log('Updating product:', { productId, title, category, description, price, imageUrl, product_story })
      const { error } = await supabase
        .from('products')
        .update({
          title,
          category,
          description,
          price,
          image_url: imageUrl || null,
          product_story: product_story || null,
        })
        .eq('id', productId)

      if (error) {
        console.error('Error updating product:', error)
        alert(`Failed to update product: ${error.message}`)
        throw error
      }

      console.log('Product updated successfully')
      alert('Product updated successfully!')
      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      console.error('Error updating product:', error)
      if (error instanceof Error) {
        alert(`Failed to update product: ${error.message}`)
      } else {
        alert('Failed to update product. Please try again.')
      }
    } finally {
      setEditProductLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"
          />
          <p className="text-[var(--muted)]">Loading dashboard...</p>
          <p className="text-sm text-[var(--muted)] mt-2">Please wait while we verify your account</p>
        </div>
      </div>
    )
  }

  if (!user || profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--muted)]">Access denied or user not found</p>
          <p className="text-sm text-[var(--muted)] mt-2">
            User: {user ? 'Yes' : 'No'} | Profile: {profile ? 'Yes' : 'No'} | Role: {profile?.role}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen heritage-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
            <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">{t('seller.title')}</h1>
          <p className="text-lg text-[var(--muted)]">{t('seller.subtitle')}</p>
          
        </motion.div>

        {/* Profile Manager Section */}
        {stallProfile && (
          <ProfileManager 
            profile={stallProfile} 
            products={products} 
            onProfileUpdate={handleProfileUpdate} 
          />
        )}

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="card-glass rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 border border-[var(--border)]"
        >
          <div className="flex gap-1 sm:gap-2 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 pb-px" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setActiveSection('products')}
              className={`px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'products'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t('seller.products') || 'Products & Auctions'}</span>
            </button>
            <button
              onClick={() => setActiveSection('analytics')}
              className={`px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'analytics'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>📊</span>
              <span>{t('seller.analytics') || 'Analytics'}</span>
            </button>
            <button
              onClick={() => setActiveSection('collaborations')}
              className={`px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'collaborations'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>🤝</span>
              <span>{t('collaboration.title') || 'Collaborations'}</span>
            </button>
          </div>
        </motion.div>

        {/* Quick Actions Section */}
        {activeSection === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-teal-200 dark:border-teal-700/50 shadow-lg"
            // Keep backdrop blur for subtle glass effect, but remove explicit light-mode background
            style={{ background: 'transparent', backdropFilter: 'blur(12px)' }}
          >
            {/* Decorative purple blob like the auction card */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-teal-200/30 rounded-full blur-3xl" />

            <div className="relative p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                  <Sparkles className="w-6 h-6 text-white animate-bounce" />
                </div>
                {t('seller.quickActions')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.productManagement')}</h3>
                  </div>
                  <button
                    onClick={() => setShowAIProductForm(true)}
                    className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                    {t('seller.addProductWithAI')}
                  </button>
                  <div className="text-xs text-gray-600 text-center mt-2">{t('seller.addProductHint')}</div>
                </div>
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.viewYourStall')}</h3>
                  </div>
                  <Link
                    href={`/stall/${user.id}`}
                    className="inline-flex items-center justify-center w-full px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <Eye className="w-5 h-5 mr-2 animate-pulse" />
                    {t('seller.viewPublicStall')}
                  </Link>
                  <div className="text-xs text-gray-600 text-center mt-2">{t('seller.viewStallHint')}</div>
                </div>
              </div>
              {/* Centered Customize 3D Stall card below the grid */}
              <div className="flex justify-center mt-6">
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3 w-full max-w-md">
                  <div className="flex items-center gap-3 mb-1 justify-center">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Palette className="w-5 h-5 text-white animate-spin-slow" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Customize 3D Stall</h3>
                  </div>
                  <button
                    onClick={() => setShowStallCustomization(true)}
                    className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <Palette className="w-5 h-5 mr-2 animate-spin-slow" />
                    Customize 3D Stall
                  </button>
                  <div className="text-xs text-gray-600 text-center mt-2">Personalize your public stall&apos;s look, welcome message, and featured products.</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      {/* Stall Customization Modal (always at page root, overlays everything) */}
      <StallCustomizationModal
        open={showStallCustomization}
        onClose={() => setShowStallCustomization(false)}
        onSave={async (settings) => {
          if (!user) {
            alert('User not authenticated');
            return;
          }
          setStallCustomizationLoading(true);
          try {
            const { error } = await supabase
              .from('stall_customizations')
              .upsert([
                {
                  seller_id: user.id,
                  stall_theme: settings.stall_theme,
                  welcome_message: settings.welcome_message,
                  decor: settings.decor,
                  featured_product_ids: settings.featured_product_ids,
                  updated_at: new Date().toISOString(),
                },
              ], { onConflict: 'seller_id' });
            if (error) {
              alert('Failed to save customization: ' + error.message);
              return;
            }
            setStallCustomizationSettings(settings);
            setShowStallCustomization(false);
            alert('Stall customization saved!');
          } catch (err) {
            alert('Failed to save customization.');
            console.error('Error saving customization:', err);
          } finally {
            setStallCustomizationLoading(false);
          }
        }}
        initialSettings={stallCustomizationSettings}
        loading={stallCustomizationLoading}
        products={products.map(p => ({ id: p.id, title: p.title || '' }))}
      />

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card-glass rounded-xl p-6 mb-8 border border-[var(--border)]"
          >
            <h2 className="text-2xl font-semibold text-[var(--text)] mb-4">{t('seller.analyticsTitle')}</h2>
            <SellerAnalytics sellerId={user.id} />
          </motion.div>
        )}

        {/* Collaborations Section */}
        {activeSection === 'collaborations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card-glass rounded-xl p-6 mb-8 border border-[var(--border)]"
          >
            <CollaborationManager userId={user.id} userName={profile?.name || 'Seller'} />
          </motion.div>
        )}

        {/* Products Section */}
        {activeSection === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card-glass rounded-xl p-6 border border-[var(--border)]"
          >
          {/* Auction Management Section */}
          <div className="mb-8 space-y-6">
            {/* Create Auction Card */}
            <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-purple-300 dark:border-purple-700/50 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <span className="text-2xl sm:text-3xl">🔨</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[var(--text)]">Create New Auction</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-[var(--muted)]">Start bidding for your products</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  const product_id = fd.get('product_id') as string
                  const starting_price = Number(fd.get('starting_price'))
                  const starts_at_raw = fd.get('starts_at') as string || ''
                  const ends_at_raw = fd.get('ends_at') as string || ''
                  const starts_at = starts_at_raw ? new Date(starts_at_raw).toISOString() : null
                  const ends_at = ends_at_raw ? new Date(ends_at_raw).toISOString() : null
                  if (!product_id || !starting_price) return alert(t('auction.invalidAmount'))
                  try {
                    const res = await fetch('/api/auction', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ product_id, starting_price, starts_at, ends_at, seller_id: user?.id }) })
                    const j = await res.json()
                    if (!res.ok) throw new Error(j.error || 'Failed')
                    alert(t('auction.created'))
                    fetchProducts()
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err)
                    alert(t('errors.general') + ': ' + message)
                  }
                }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Product Selection */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-[var(--text)] mb-2">
                        <span className="inline-flex items-center gap-2">
                          🎨 Select Product
                        </span>
                      </label>
                      <select 
                        name="product_id" 
                        className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none shadow-sm"
                        required
                      >
                        <option value="">Choose a product to auction...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Starting Price */}
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-[var(--text)] mb-2">
                        <span className="inline-flex items-center gap-2">
                          💰 Starting Price
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-purple-600 dark:text-purple-400">₹</span>
                        <input 
                          name="starting_price" 
                          type="number" 
                          placeholder="Enter starting bid" 
                          className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none shadow-sm"
                          required 
                        />
                      </div>
                    </div>

                    {/* Date/Time Inputs */}
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-[var(--text)] mb-2">
                        <span className="inline-flex items-center gap-2">
                          📅 Schedule (Optional)
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-[var(--muted)] mb-1">Start</label>
                          <input 
                            name="starts_at" 
                            type="datetime-local" 
                            className="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 transition-all outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-[var(--muted)] mb-1">End</label>
                          <input 
                            name="ends_at" 
                            type="datetime-local" 
                            className="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-6">
                    <button 
                      type="submit" 
                      className="w-full sm:w-auto px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>🚀</span>
                        <span>Launch Auction</span>
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Active Auctions List */}
            <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-amber-300 dark:border-amber-700/50 shadow-lg">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-200/30 to-orange-200/30 rounded-full blur-3xl"></div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                    <span className="text-2xl sm:text-3xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[var(--text)]">Your Active Auctions</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-[var(--muted)]">Manage your ongoing auctions</p>
                  </div>
                </div>
                <SellerAuctionsList sellerId={user.id} />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{t('seller.yourProducts')}</h2>
            <div className="flex items-center gap-2 sm:space-x-3 flex-wrap">
              <Link
                href="/dashboard/seller/reels"
                className="flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('seller.manageReels')}</span>
                <span className="sm:hidden">Reels</span>
              </Link>
              <button
                onClick={() => setShowAIProductForm(true)}
                className="flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">{t('seller.addProductWithAI')}</span>
                <span className="sm:hidden">Add</span>
              </button>
              {/* Sign out button removed as requested */}
            </div>
          </div>

          {productsLoading ? (
            <div className="text-center py-12">
        <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"
              />
        <p className="text-[var(--muted)] text-lg">{t('seller.loadingProducts')}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
        <Palette className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--muted)] mx-auto mb-4" />
        <p className="text-[var(--muted)] text-base sm:text-lg">{t('seller.noProducts')}</p>
        <p className="text-[var(--muted)] text-sm">{t('seller.startByAddingFirst')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
          className="card border overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
          <div className="h-40 sm:h-48 bg-[var(--bg-2)] flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Palette className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-sm sm:text-base text-[var(--text)] mb-2 line-clamp-2">{product.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--muted)] mb-2">{product.category}</p>
                    <p className="text-base sm:text-lg font-bold text-orange-500">₹{product.price}</p>
                    <div className="flex flex-col xs:flex-row gap-2 mt-3">
                      <button
                        onClick={() => {
                          setEditingProduct(product)
                        }}
            className="flex-1 flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-red-300 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        )}



        {/* Edit Product Modal (AI Unified) */}
        {editingProduct && (
          <AIProductForm
            initialData={{
              title: editingProduct.title || undefined,
              category: editingProduct.category || undefined,
              description: editingProduct.description || undefined,
              price: editingProduct.price || undefined,
              imageUrl: editingProduct.image_url || undefined,
              product_story: editingProduct.product_story || undefined,
            }}
            onSubmit={async (formData) => {
              try {
                await handleEditProduct(editingProduct.id, formData);
                setEditingProduct(null);
                // Return the product ID so AIProductForm can use it for reel creation
                return editingProduct.id;
              } catch (error) {
                console.error('Error saving edited product:', error);
                // keep modal open on error
                return null;
              }
            }}
            onCancel={() => setEditingProduct(null)}
            loading={editProductLoading}
          />
        )}

        {/* AI Product Form Modal */}
        {showAIProductForm && (
          <AIProductForm
            onSubmit={async (formData) => {
              try {
                // Convert FormData to the format expected by handleAddProduct
                const form = document.createElement('form')
                formData.forEach((value, key) => {
                  const input = document.createElement('input')
                  input.name = key
                  input.value = value as string
                  form.appendChild(input)
                })
                // Create a synthetic event
                const syntheticEvent = {
                  preventDefault: () => {},
                  currentTarget: form
                } as React.FormEvent<HTMLFormElement>
                // Call handleAddProduct and return productId
                const productId = await handleAddProduct(syntheticEvent)
                setShowAIProductForm(false)
                return productId;
              } catch (error) {
                console.error('Error submitting AI form:', error)
                // Don't close the form if there's an error
                return null;
              }
            }}
            onCancel={() => setShowAIProductForm(false)}
            loading={addProductLoading}
          />
        )}
      </div>
    </div>
  )
}
