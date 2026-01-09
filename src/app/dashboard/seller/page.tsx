
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
import VirtualProductForm from '@/components/VirtualProductForm'
import SellerAnalytics from './SellerAnalytics'
import ProfileManager from './ProfileManager'
import SellerAuctionsList from './SellerAuctionsList'
import CollaborationManager from './CollaborationManager'
import StallCustomizationModal, { StallCustomizationSettings } from '@/components/StallCustomizationModal'
import { useLanguage } from '@/components/LanguageProvider'

type Product = Database['public']['Tables']['products']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

// Extend window for global tour flag
declare global {
  interface Window {
    __sellerDashboardTourStarted?: boolean;
  }
}
// --- Scheme Connect State and Fetch ---
type Scheme = {
  id: string;
  name: string;
  description: string;
  link?: string;
  eligibility?: string;
  deadline?: string;
};


export default function SellerDashboard() {
  // Declare global flag for tour on window

  // --- Onboarding Tour Logic ---
  // Step definitions for seller dashboard
  type TourStep = {
    element: string;
    intro: string;
  };
  const getTourSteps = (): TourStep[] => [
    {
      element: '#seller-dashboard-header',
      intro: '<span style="font-size:1.2em">👋 <b>Welcome Seller!</b></span><br/>This is your dashboard where you manage products, analytics, and more.',
    },
    {
      element: '#seller-dashboard-tabs',
      intro: 'Navigate between <b>Products</b>, <b>Analytics</b>, <b>Collaborations</b>, <b>Scheme Connect</b>, and <b>Custom Requests</b> using these tabs.',
    },
    {
      element: '#quick-action-add-product',
      intro: 'Add a new product using AI assistance.',
    },
    {
      element: '#quick-action-add-virtual',
      intro: 'No Resource- No Limit! Add a virtual product to your stall.',
    },
    {
      element: '#quick-action-view-stall',
      intro: 'View your public stall as buyers see it.',
    },
    {
      element: '#quick-action-customize-stall',
      intro: 'Customize your 3D stall appearance and features.',
    },
    {
      element: '#launch-auction-btn',
      intro: 'Launch a new auction for your product here.',
    },
    {
      element: '#your-active-auctions-text',
      intro: 'This shows your <b>Active Auctions</b> and their progress.',
    },
    {
      element: '#seller-products-section',
      intro: 'Manage your products here. Edit, delete, or add new products using the buttons provided.',
    },
  ];

  // Auto-start Intro.js tour for new sellers (client-only)
  // Prevent multiple tours from starting (global flag)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('hasSeenSellerDashboardTour');
    const navbarIntroDone = localStorage.getItem('hasSeenKalaMitraNavbarIntro');
    // Wait for navbar intro to finish before starting dashboard tour
    if (!seen && !window.__sellerDashboardTourStarted) {
      const tryStartDashboardTour = () => {
        const navbarIntroDoneNow = localStorage.getItem('hasSeenKalaMitraNavbarIntro');
        if (navbarIntroDoneNow === 'true') {
          window.__sellerDashboardTourStarted = true;
          Promise.all([
            import('intro.js'),
          ]).then(([introJsModule]) => {
            const introJs = introJsModule.default;
            const steps = getTourSteps();
            const checkAllTargets = () => {
              const allExist = steps.every(step => step.element && document.querySelector(step.element));
              if (allExist) {
                const isMobile = window.innerWidth <= 640;
                const instance = introJs();
                instance.setOptions({
                  steps,
                  showProgress: true,
                  showBullets: false,
                  exitOnOverlayClick: true,
                  exitOnEsc: false,
                  scrollToElement: true,
                  overlayOpacity: 0.3,
                  tooltipClass: 'kalamitra-intro-theme',
                  highlightClass: 'kalamitra-intro-highlight',
                  nextLabel: 'Next →',
                  prevLabel: '← Back',
                  doneLabel: '✨ Done',
                  skipLabel: 'Skip',
                });
                // Custom scroll handler for mobile
                if (isMobile) {
                  instance.onbeforechange(function(targetElement) {
                    if (targetElement && typeof targetElement.scrollIntoView === 'function') {
                      setTimeout(() => {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 80);
                    }
                    return true;
                  });
                }
                instance.oncomplete(() => {
                  localStorage.setItem('hasSeenSellerDashboardTour', 'true');
                  window.__sellerDashboardTourStarted = false;
                })
                .onexit(() => {
                  localStorage.setItem('hasSeenSellerDashboardTour', 'true');
                  window.__sellerDashboardTourStarted = false;
                })
                .start();
              } else {
                setTimeout(checkAllTargets, 100);
              }
            };
            checkAllTargets();
          });
        } else {
          setTimeout(tryStartDashboardTour, 200);
        }
      };
      tryStartDashboardTour();
    }
  }, []);
  const { user, profile, loading, signOut } = useAuth()
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()
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
  const [activeSection, setActiveSection] = useState<'products' | 'analytics' | 'collaborations' | 'customRequests' | 'schemeConnect'>('products')
  type CustomRequest = {
    id: string;
    description: string;
    status: string;
    buyer_id: string;
    product_id: string;
    ai_draft_url?: string;
    // ...other fields as needed
  };
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  type Donation = {
    id: string;
    donor_name: string;
    donor_email: string;
    donor_phone: string;
    item_description: string;
    item_category: string;
    image_urls?: string[];
    pickup_address: string;
    preferred_contact: string;
    status: string;
    claimed_by?: string | null;
    claimed_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
  };
  const [donations, setDonations] = useState<Donation[]>([]);
  const [customRequestsLoading, setCustomRequestsLoading] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState<CustomRequest | null>(null);
  const [showVirtualProductForm, setShowVirtualProductForm] = useState(false);
  const [respondMessage, setRespondMessage] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondSuccess, setRespondSuccess] = useState(false);
    const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
    const [productNames, setProductNames] = useState<Record<string, string>>({});

  // Handler for marking request as completed
  const handleMarkCompleted = async (requestId: string) => {
    if (!requestId) return;
    try {
      setCustomRequestsLoading(true);
      const res = await fetch('/api/custom-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'Completed' })
      });
      if (!res.ok) throw new Error('Failed to update request');
      // Refresh requests
      fetch(`/api/custom-request?seller_id=${user!.id}`)
        .then(res => res.json())
        .then(({ data }) => setCustomRequests((data || []) as CustomRequest[]))
        .catch(() => setCustomRequests([]));
    } catch (err) {
      alert('Failed to mark as completed');
    } finally {
      setCustomRequestsLoading(false);
    }
  };

  // Handler for opening respond modal
  const handleRespond = (req: CustomRequest) => {
    setRespondingRequest(req);
    setRespondMessage('');
    setRespondModalOpen(true);
  };

  // Handler for sending response
  const handleSendResponse = async () => {
    if (!respondingRequest || !respondMessage || !user?.id) return;
    setRespondLoading(true);
    setRespondSuccess(false);
    try {
      // Send DM to buyer
      const dmPayload = {
        sender_id: user.id,
        receiver_id: respondingRequest.buyer_id,
        message: respondMessage,
        custom_request_id: respondingRequest.id,
        sent_at: new Date().toISOString(),
      };
      // Find or create threadId between seller and buyer
      let threadId = null;
      // Try to find existing thread
      const threadRes = await fetch(`/api/chat/thread?userA=${user.id}&userB=${respondingRequest.buyer_id}`);
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        threadId = threadData.threadId || threadData.id || null;
      }
      // If not found, create new thread
      if (!threadId) {
        const createRes = await fetch('/api/chat/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userA: user.id, userB: respondingRequest.buyer_id }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          threadId = createData.threadId || createData.id || null;
        }
      }
      if (!threadId) throw new Error('Could not find or create chat thread');
      // Send message
      // Add reference to custom request in message content
      const referenceText = respondingRequest?.description
        ? `[Regarding your custom request: "${respondingRequest.description}"]` + String.fromCharCode(13,10,13,10) : '';
      const chatPayload = {
        threadId,
        senderId: user.id,
        content: referenceText + respondMessage,
        messageType: 'text',
      };
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
      });
      if (!res.ok) throw new Error('Failed to send DM');

      // Insert notification for buyer
      await supabase
        .from('notifications')
        .insert({
          user_id: respondingRequest.buyer_id,
          title: 'Seller responded to your custom request',
          body: `${profile?.name || 'Seller'} responded to your custom request: "${respondingRequest.description}"`,
          read: false,
          metadata: {
            type: 'custom_request_response',
            custom_request_id: respondingRequest.id,
            seller_id: user.id,
            thread_id: threadId
          }
        });

      setRespondSuccess(true);
      // Optionally, close modal after a short delay
      setTimeout(() => {
        setRespondModalOpen(false);
        setRespondSuccess(false);
      }, 1800);
    } catch (err) {
      setRespondSuccess(false);
      alert('Failed to send response');
    } finally {
      setRespondLoading(false);
    }
  };
const handleMicRespond = () => {
  if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : typeof window extends { webkitSpeechRecognition: infer U } ? U : never;
    const win = window as typeof window & {
      SpeechRecognition?: typeof SpeechRecognition;
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const SpeechRecognitionCtor: typeof SpeechRecognition | undefined = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    const langMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kannada: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', malayalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', telugu: 'te-IN', urdu: 'ur-IN', as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
    };
  const appLang = i18n && i18n.language ? i18n.language : 'en';
    recognition.lang = langMap[appLang] || appLang || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setRespondMessage(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onerror = (event: Event) => {
      const error = (event as { error?: string }).error;
      alert('Voice input error: ' + (error || 'Unknown error'));
    };
    recognition.start();
  } else {
    alert('Speech recognition not supported in this browser.');
  }
};
const [schemes, setSchemes] = useState<Scheme[]>([]);
const [schemesLoading, setSchemesLoading] = useState(false);


useEffect(() => {
  if (activeSection !== 'schemeConnect') return;
  let cancelled = false;
  setSchemesLoading(true);

  (async () => {
    try {
      // Only fetch active schemes: is_active = true and deadline is null or deadline >= today
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('schemes')
        .select('*')
        .eq('is_active', true)
        .or(`deadline.is.null,deadline.gte.${today}`)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setSchemes([]);
        // Optionally, show error toast
      } else {
        setSchemes(data || []);
      }
    } catch (err) {
      if (!cancelled) {
        setSchemes([]);
        // Optionally, log the error
        console.error('Error fetching schemes:', err);
      }
    } finally {
      if (!cancelled) setSchemesLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [activeSection]);
  // Fetch custom requests for seller
  useEffect(() => {
    if (activeSection !== 'customRequests' || !user) return;
    setCustomRequestsLoading(true);
    // Fetch custom requests
    fetch(`/api/custom-request?seller_id=${user!.id}`)
      .then(res => res.json())
      .then(({ data }) => {
        setCustomRequests(data || []);
        const buyerIds = Array.from(new Set((data || []).map((r: CustomRequest) => r.buyer_id).filter(Boolean)));
        const productIds = Array.from(new Set((data || []).map((r: CustomRequest) => r.product_id).filter(Boolean)));
        if (buyerIds.length > 0) {
          supabase.from('profiles').select('id, name').in('id', buyerIds).then(({ data }) => {
            if (data) {
              type BuyerProfile = { id: string; name: string };
              const map: Record<string, string> = {};
              (data as BuyerProfile[]).forEach((p) => { map[p.id] = p.name; });
              setBuyerNames(map);
            }
          });
        }
        if (productIds.length > 0) {
          supabase.from('products').select('id, title').in('id', productIds).then(({ data }) => {
            if (data) {
              type ProductProfile = { id: string; title: string };
              const map: Record<string, string> = {};
              (data as ProductProfile[]).forEach((p) => { map[p.id] = p.title; });
              setProductNames(map);
            }
          });
        }
      })
      .catch(() => setCustomRequests([]));
    // Fetch live donations (status = 'new')
    (async () => {
      try {
        const { data, error } = await supabase
          .from('donations')
          .select('*')
          .eq('status', 'new');
        if (!error) setDonations(data || []);
        else setDonations([]);
      } catch {
        setDonations([]);
      } finally {
        setCustomRequestsLoading(false);
      }
    })();
  }, [activeSection, user]);
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
    const handleMarkClaimed = async (donationId: string) => {
    if (!donationId) return;
    try {
      setCustomRequestsLoading(true);
      // Update donation status to 'claimed' in Supabase
      const { error } = await supabase
        .from('donations')
        .update({ status: 'claimed', claimed_at: new Date().toISOString(), claimed_by: user?.id })
        .eq('id', donationId);
      if (error) throw new Error('Failed to mark donation as claimed');
      // Refresh donations
      const { data, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'new');
      setDonations(fetchError ? [] : data || []);
    } catch (err) {
      alert('Failed to mark donation as claimed');
    } finally {
      setCustomRequestsLoading(false);
    }
  };

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
  const product_type = formData.get('product_type') as 'vertical' | 'horizontal' | null

  // Debug: Log all form data
  console.log('=== FORM DATA DEBUG ===')
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`)
  }
  console.log('Extracted product_type:', product_type)
  
  // Fallback if product_type is not found
  const finalProductType = product_type || 'vertical'
  console.log('Final product_type to save:', finalProductType)

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
  console.log('Product data:', { title, category, description, price, imageUrl, product_story, product_type })
      
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
        product_type: finalProductType,
      })
      
      // Test if product_type column exists by trying a simple query first
      try {
        const { data: testData, error: testError } = await supabase
          .from('products')
          .select('product_type')
          .limit(1)
        console.log('Column test result:', { testData, testError })
      } catch (testErr) {
        console.log('Column test error:', testErr)
      }
      


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
            product_type: finalProductType,
            is_virtual: formData.get('is_virtual') === 'true',
            virtual_type: formData.get('virtual_type') ,
            virtual_file_url: formData.get('virtual_file_url') || null,
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
        } else if (error.message.includes('product_type')) {
          alert('Product type column error. Please run the database migration to add the product_type column.')
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
      // Trigger embedding backfill for all products (including new one)
      try {
        await fetch('/api/backfill-embeddings', { method: 'GET' });
        console.log('Triggered /api/backfill-embeddings after product creation');
      } catch (err) {
        console.error('Failed to trigger /api/backfill-embeddings:', err);
      }
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
  const product_type = formData.get('product_type') as 'vertical' | 'horizontal' | null
  const virtual_type = formData.get('virtual_type') as string | null
  const virtual_file_url = formData.get('virtual_file_url') as string | null

    // Basic validation
    if (!title || !category || !description || isNaN(price) || price <= 0) {
      alert('Please fill in all required fields with valid values.')
      setEditProductLoading(false)
      return
    }

    try {
      console.log('Updating product:', { productId, title, category, description, price, imageUrl, product_story, product_type, virtual_type, virtual_file_url })
      const updateObj: {
        title: string;
        category: string;
        description: string;
        price: number;
        image_url: string | null;
        product_story: string | null;
        product_type: 'vertical' | 'horizontal';
        virtual_type?: string | null;
        virtual_file_url?: string | null;
      } = {
        title,
        category,
        description,
        price,
        image_url: imageUrl || null,
        product_story: product_story || null,
        product_type: product_type || 'vertical',
      };
      // Only update virtual fields if present in formData
      if (virtual_type !== undefined) updateObj.virtual_type = virtual_type;
      if (virtual_file_url !== undefined) updateObj.virtual_file_url = virtual_file_url;
      const { error } = await supabase
        .from('products')
        .update(updateObj)
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
          id="seller-dashboard-header"
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
          id="seller-dashboard-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="card-glass rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 border border-[var(--border)]"
        >
          {/* Desktop: All tabs in a row. Mobile: Only first 3 tabs horizontally. */}
          <div className="flex gap-1 sm:gap-2 overflow-x-auto px-2 sm:px-0 pb-px w-full min-w-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Products Tab */}
            <button
              onClick={() => setActiveSection('products')}
              className={`flex-1 sm:flex-initial px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'products'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t('seller.products') || 'Products & Auctions'}</span>
            </button>
            {/* Analytics Tab */}
            <button
              onClick={() => setActiveSection('analytics')}
              className={`flex-1 sm:flex-initial px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'analytics'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>📊</span>
              <span>{t('seller.analytics') || 'Analytics'}</span>
            </button>
            {/* Collaborations Tab */}
            <button
              onClick={() => setActiveSection('collaborations')}
              className={`flex-1 sm:flex-initial px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'collaborations'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>🤝</span>
              <span>{t('collaboration.title') || 'Collaborations'}</span>
            </button>
            {/* Scheme Connect Tab */}
            <button
              onClick={() => setActiveSection('schemeConnect')}
              className={`px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'schemeConnect'
                  ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              // Hide on mobile, show on sm and up
              style={{ display: 'none', ...(window.innerWidth >= 640 ? { display: 'flex' } : {}) }}
            >
              <span>🏛️</span>
              <span>{t('seller.schemeConnectTab')}</span>
            </button>
            {/* Custom Requests tab: only show inline on desktop (sm and up) */}
            <button
              onClick={() => setActiveSection('customRequests')}
              className={`hidden sm:flex px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-2 ${
                activeSection === 'customRequests'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t('seller.customRequestsTab')}</span>
            </button>
          </div>
          {/* On mobile, show Scheme Connect and Custom Requests tabs below, centered */}
          <div className="flex sm:hidden justify-center items-center mt-3 gap-2">
            <button
              onClick={() => setActiveSection('schemeConnect')}
              className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                activeSection === 'schemeConnect'
                  ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>🏛️</span>
              <span>{t('seller.schemeConnectTab')}</span>
            </button>
            <button
              onClick={() => setActiveSection('customRequests')}
              className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                activeSection === 'customRequests'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                  : 'bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('seller.customRequestsTabMobile')}</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content Sections - rendered below the tab row */}
        {activeSection === 'schemeConnect' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card-glass rounded-xl p-6 mb-8 border border-[var(--border)]"
          >
            <h2 className="text-2xl font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="text-green-500 dark:text-blue-400 text-3xl">🏛️</span>
              {t('seller.schemeConnectSectionTitle')}
            </h2>
            <div className="text-[var(--muted)] text-base mb-4">
              {t('seller.schemeConnectDescription')}
            </div>
            {/* Fetch and display schemes from Supabase here */}
            {schemesLoading ? (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"
                />
                <p className="text-[var(--muted)] text-lg">{t('seller.schemeConnectLoading')}</p>
              </div>
            ) : schemes.length === 0 ? (
              <div className="text-center text-sm text-[var(--muted)] opacity-70 py-8">
                {t('seller.schemeConnectNone')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {schemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    className="card border overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-[var(--bg-2)] dark:bg-[var(--bg-2)] rounded-xl"
                  >
                    <div className="p-4 flex flex-col gap-2">
                      <h3 className="font-semibold text-base text-[var(--text)] mb-1 line-clamp-2">{scheme.name}</h3>
                      <p className="text-xs text-[var(--muted)] mb-2 line-clamp-3">{scheme.description}</p>
                      {scheme.link && (
                        <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 underline mb-2">{t('seller.schemeConnectLearnMore')}</a>
                      )}
                      {scheme.eligibility && (
                        <p className="text-xs text-[var(--muted)]"><span className="font-bold">{t('seller.schemeConnectEligibility')}</span> {scheme.eligibility}</p>
                      )}
                      <p className="text-xs text-[var(--muted)]">
                        <span className="font-bold">{t('seller.schemeConnectDeadline')}</span> {scheme.deadline == null ? t('seller.schemeConnectOngoing', 'Ongoing') : scheme.deadline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Custom Requests Section */}
        {activeSection === 'customRequests' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card-glass rounded-xl p-6 mb-8 border border-[var(--border)]"
          >
            <h2 className="text-2xl font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-teal-500 dark:text-cyan-400" />
              {t('seller.customRequestsSectionTitle')}
            </h2>
            {customRequestsLoading ? (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full mx-auto mb-4"
                />
                <p className="text-[var(--muted)] text-lg">{t('seller.customRequestsLoading')}</p>
              </div>
            ) : (
              <>
                {/* Custom Requests List */}
                {customRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--muted)] mx-auto mb-4" />
                    <p className="text-[var(--muted)] text-base sm:text-lg">{t('seller.customRequestsNone')}</p>
                    <p className="text-[var(--muted)] text-sm">{t('seller.customRequestsBuyerHint')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {customRequests.map((req) => (
                      <div
                        key={req.id}
                        className="card border overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-[var(--bg-2)] dark:bg-[var(--bg-2)] rounded-xl"
                      >
                        <div className="p-4 flex flex-col gap-2">
                          <h3 className="font-semibold text-base text-[var(--text)] mb-1">{req.description}</h3>
                          <p className="text-xs text-[var(--muted)]">{t('seller.customRequestsStatus')} <span className="font-bold">{req.status}</span></p>
                          {req.ai_draft_url && (
                            <a href={req.ai_draft_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 dark:text-cyan-400 underline">{t('seller.customRequestsViewAIDraft')}</a>
                          )}
                          <p className="text-xs text-[var(--muted)]">{t('seller.customRequestsRequestedBy')} <span className="font-bold">{buyerNames[req.buyer_id] || req.buyer_id}</span></p>
                          <p className="text-xs text-[var(--muted)]">{t('seller.customRequestsProduct')} <span className="font-bold">{productNames[req.product_id] || req.product_id}</span></p>
                          <div className="flex gap-2 mt-2">
                            {req.status === 'Completed' ? (
                              <span className="w-full px-3 py-2 text-xs rounded-md bg-green-100 text-green-700 font-semibold shadow border border-green-300 text-center cursor-default select-none">{t('seller.customRequestsCompleted')}</span>
                            ) : (
                              <>
                                <button
                                  className="flex-1 px-3 py-2 text-xs rounded-md bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
                                  onClick={() => handleRespond(req)}
                                  disabled={customRequestsLoading}
                                >{t('seller.customRequestsRespond')}</button>
                                <button
                                  className="flex-1 px-3 py-2 text-xs rounded-md bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white font-semibold shadow hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-800 dark:hover:to-gray-900 transition-all"
                                  onClick={() => handleMarkCompleted(req.id)}
                                  disabled={customRequestsLoading}
                                >{t('seller.customRequestsMarkCompleted')}</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Donations Section */}
                {donations.filter(donation => donation.status === 'new' && !donation.claimed_by).length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-xl font-bold text-orange-600 mb-4 flex items-center gap-2">
                      <span>🎁</span> {t('seller.liveDonationsSectionTitle', 'Available Donated Items')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {donations.filter(donation => donation.status === 'new' && !donation.claimed_by).map((donation) => (
                        <div
                          key={donation.id}
                          className="card border overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-[var(--bg-2)] dark:bg-[var(--bg-2)] rounded-xl"
                        >
                          {/* Show image if available */}
                          {donation.image_urls && donation.image_urls.length > 0 && donation.image_urls[0] && (
                            <div className="h-40 sm:h-48 bg-gray-100 flex items-center justify-center border-b border-[var(--border)]">
                              <img
                                src={donation.image_urls[0]}
                                alt={donation.item_description}
                                className="w-full h-full object-cover rounded-t-xl"
                                style={{ maxHeight: '12rem' }}
                              />
                            </div>
                          )}
                          <div className="p-4 flex flex-col gap-2">
                            <h3 className="font-semibold text-base text-[var(--text)] mb-1">{donation.item_description}</h3>
                            <p className="text-xs text-[var(--muted)]">{t('seller.donationDonor')}: <span className="font-bold">{donation.donor_name}</span></p>
                            <p className="text-xs text-[var(--muted)]">{t('seller.donationContact')}: <span className="font-bold">{donation.donor_phone || donation.donor_email}</span></p>
                            <p className="text-xs text-[var(--muted)]">{t('seller.donationPickupAddress')}: <span className="font-bold">{donation.pickup_address}</span></p>
                            <div className="flex flex-col gap-2 mt-2">
                              {(donation.donor_phone || donation.donor_email) && (
                                <button
                                  className="flex items-center justify-center px-3 py-2 text-xs rounded-md bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold shadow hover:from-green-600 hover:to-teal-700 transition-all"
                                  onClick={() => {
                                    if (donation.donor_phone) {
                                      window.open(`tel:${donation.donor_phone}`)
                                    } else if (donation.donor_email) {
                                      window.open(`mailto:${donation.donor_email}`)
                                    }
                                  }}
                                >
                                  📞 {donation.donor_phone ? donation.donor_phone : donation.donor_email}
                                </button>
                              )}
                              {/* Mark Claimed button or Claimed message */}
                              {donation.claimed_by ? (
                                <span
                                  className="flex items-center justify-center px-3 py-2 text-xs rounded-md bg-gray-200 text-gray-600 font-semibold shadow border border-gray-300 cursor-not-allowed select-none"
                                  title="This donation has already been claimed by a seller. The product is not available."
                                >
                                  ❌ {t('seller.donationAlreadyClaimed', 'Already Claimed')}
                                </span>
                              ) : (
                                <button
                                  className="flex items-center justify-center px-3 py-2 text-xs rounded-md bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow hover:from-orange-600 hover:to-red-700 transition-all"
                                  onClick={() => handleMarkClaimed(donation.id)}
                                  disabled={customRequestsLoading}
                                  title="If you have claimed this item, mark as claimed. The product will not be available to others."
                                >
                                  ✅ {t('seller.donationMarkClaimed', 'Mark Claimed')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-3">{t('seller.liveDonationsSectionHint', 'You can claim these donated items and convert them into products for your stall.')}</div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Quick Actions Section */}
        {activeSection === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-teal-200 dark:border-teal-700/50 shadow-lg"
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
                {/* Product Management Card */}
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.productManagement')}</h3>
                  </div>
                  <button
                    id="quick-action-add-product"
                    onClick={() => setShowAIProductForm(true)}
                    className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                    {t('seller.addProductWithAI')}
                  </button>
                  <div className="text-xs text-gray-600 text-center mt-2">{t('seller.addProductHint')}</div>
                </div>
                {/* Virtual Product Management Card */}
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
                      <span className="text-2xl">🧩</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.virtualProductManagement')}</h3>
                  </div>
                  <button
                    id="quick-action-add-virtual"
                    onClick={() => setShowVirtualProductForm(true)}
                    className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:via-teal-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <span className="text-xl mr-2 animate-pulse">🧩</span>
                    {t('seller.addVirtualProduct')}
                  </button>
                  <div className="text-xs text-gray-600 text-center mt-2">{t('seller.virtualProductHint')}</div>
                </div>
                {/* View Stall Card */}
                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.viewYourStall')}</h3>
                  </div>
                  <Link
                    id="quick-action-view-stall"
                    href={`/stall/${user.id}`}
                    className="inline-flex items-center justify-center w-full px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                  >
                    <Eye className="w-5 h-5 mr-2 animate-pulse" />
                    {t('seller.viewPublicStall')}
                  </Link>
                  <div className="text-xs text-gray-600 text-center mt-2">{t('seller.viewStallHint')}</div>
                </div>

              {/* Centered Customize 3D Stall card below the grid */}

                <div className="rounded-xl bg-transparent p-5 shadow-md flex flex-col gap-3">
                  <div className="flex items-center gap-3 mb-1 ">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                      <Palette className="w-5 h-5 text-white animate-spin-slow" />
                    </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('seller.customize3DStallTitle')}</h3>
                  </div>
                    <button
                      id="quick-action-customize-stall"
                      onClick={() => setShowStallCustomization(true)}
                      className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-200"
                    >
                      <Palette className="text-xl mr-2 animate-spin-slow" />
                      {t('seller.customize3DStallButton')}
                    </button>
                    <div className="text-xs text-gray-600 text-center mt-2">{t('seller.customize3DStallDesc')}</div>
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
          <div id="seller-auction-section" className="mb-8 space-y-6">
            {/* Create Auction Card */}
            <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-purple-300 dark:border-purple-700/50 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <span className="text-2xl sm:text-3xl">🔨</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[var(--text)]">{t('seller.auctionCreateTitle')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-[var(--muted)]">{t('seller.auctionCreateDesc')}</p>
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
                          🎨 {t('seller.auctionSelectProduct')}
                        </span>
                      </label>
                      <select 
                        name="product_id" 
                        className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none shadow-sm"
                        required
                      >
                        <option value="">{t('seller.auctionSelectProductOption')}</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Starting Price */}
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-[var(--text)] mb-2">
                        <span className="inline-flex items-center gap-2">
                          💰 {t('seller.auctionStartingPrice')}
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-purple-600 dark:text-purple-400">₹</span>
                        <input 
                          name="starting_price" 
                          type="number" 
                          placeholder={t('seller.auctionStartingPricePlaceholder')}
                          className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none shadow-sm"
                          required 
                        />
                      </div>
                    </div>

                    {/* Date/Time Inputs */}
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-[var(--text)] mb-2">
                        <span className="inline-flex items-center gap-2">
                          📅 {t('seller.auctionSchedule')}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-[var(--muted)] mb-1">{t('seller.auctionStartLabel')}</label>
                          <input 
                            name="starts_at" 
                            type="datetime-local" 
                            className="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-[var(--text)] border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 transition-all outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-[var(--muted)] mb-1">{t('seller.auctionEndLabel')}</label>
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
                      id="launch-auction-btn"
                      type="submit" 
                      className="w-full sm:w-auto px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>🚀</span>
                        <span>{t('seller.auctionLaunchButton')}</span>
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Active Auctions List */}
            <div id="seller-active-auctions" className="relative overflow-hidden rounded-2xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-amber-300 dark:border-amber-700/50 shadow-lg">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-200/30 to-orange-200/30 rounded-full blur-3xl"></div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                    <span className="text-2xl sm:text-3xl">⚡</span>
                  </div>
                  <div>
                    <h3 id="your-active-auctions-text" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[var(--text)]">{t('seller.auctionActiveTitle')}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-[var(--muted)]">{t('seller.auctionActiveDesc')}</p>
                  </div>
                </div>
                <SellerAuctionsList sellerId={user.id} />
              </div>
            </div>
          </div>
      <div id="seller-products-section" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
    <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">{t('seller.yourProducts')}</h2>
            <div className="flex items-center gap-2 sm:space-x-3 flex-wrap">
              <Link
                href="/dashboard/seller/reels"
                className="flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('seller.manageReels')}</span>
                <span className="sm:hidden">{t('seller.productsReelsMobile')}</span>
              </Link>
              <button
                onClick={() => setShowAIProductForm(true)}
                className="flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
  <span className="hidden sm:inline">{t('seller.addProductWithAI')}</span>
    <span className="sm:hidden">{t('seller.productsAddMobile')}</span>
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
          editingProduct.is_virtual ? (
            <VirtualProductForm
              initialData={{
                title: editingProduct.title || undefined,
                category: editingProduct.category || undefined,
                description: editingProduct.description || undefined,
                price: editingProduct.price || undefined,
                imageUrl: editingProduct.image_url || undefined,
                product_story: editingProduct.product_story || undefined,
                product_type: (editingProduct?.product_type as 'vertical' | 'horizontal' | undefined) || 'vertical',
                virtual_type: editingProduct.virtual_type || undefined,
                virtual_file_url: editingProduct.virtual_file_url || undefined,
              }}
              onSubmit={async (formData) => {
                try {
                  await handleEditProduct(editingProduct.id, formData);
                  setEditingProduct(null);
                  return editingProduct.id;
                } catch (error) {
                  console.error('Error saving edited product:', error);
                  return null;
                }
              }}
              onCancel={() => setEditingProduct(null)}
              loading={editProductLoading}
            />
          ) : (
            <AIProductForm
              initialData={{
                title: editingProduct.title || undefined,
                category: editingProduct.category || undefined,
                description: editingProduct.description || undefined,
                price: editingProduct.price || undefined,
                imageUrl: editingProduct.image_url || undefined,
                product_story: editingProduct.product_story || undefined,
                product_type: (editingProduct?.product_type as 'vertical' | 'horizontal' | undefined) || 'vertical',
              }}
              onSubmit={async (formData) => {
                try {
                  await handleEditProduct(editingProduct.id, formData);
                  setEditingProduct(null);
                  return editingProduct.id;
                } catch (error) {
                  console.error('Error saving edited product:', error);
                  return null;
                }
              }}
              onCancel={() => setEditingProduct(null)}
              loading={editProductLoading}
            />
          )
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

        {/* Virtual Product Form Modal */}
        {showVirtualProductForm && (
          <VirtualProductForm
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
                setShowVirtualProductForm(false)
                return productId;
              } catch (error) {
                console.error('Error submitting virtual product form:', error)
                // Don't close the form if there's an error
                return null;
              }
            }}
            onCancel={() => setShowVirtualProductForm(false)}
            loading={addProductLoading}
          />
        )}
        

{/* Respond Modal (always at page root, overlays everything) */}
{respondModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-teal-100/60 via-cyan-100/60 to-blue-100/60 dark:from-gray-900/80 dark:via-gray-950/80 dark:to-gray-900/80 backdrop-blur-sm transition-colors">
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-0 w-full max-w-lg mx-auto border border-teal-200 dark:border-cyan-700/40 overflow-hidden transition-colors">
      {/* Decorative Top Bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 dark:from-cyan-700 dark:via-blue-800 dark:to-teal-700 rounded-t-2xl transition-colors" />
      {/* Icon and Title */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 dark:from-cyan-700 dark:to-blue-700 shadow text-white text-2xl transition-colors">
          <Sparkles className="w-7 h-7" />
        </span>
        <div>
          <h3 className="text-2xl font-extrabold text-teal-700 dark:text-cyan-300 mb-1 transition-colors">{t('seller.respondModalTitle')}</h3>
          <p className="text-sm text-[var(--muted)] dark:text-cyan-200/80 transition-colors">{t('seller.respondModalSubtitle')}</p>
        </div>
      </div>
      {/* Request Description */}
      <div className="px-6 pt-2 pb-1">
        <div className="bg-teal-50 dark:bg-gray-800 border border-teal-200 dark:border-cyan-700/30 rounded-lg p-3 text-[var(--text)] dark:text-cyan-100 text-base font-medium mb-2 shadow-sm transition-colors">
          {respondingRequest?.description}
        </div>
      </div>
      {/* Response Input or Success Message */}
      <div className="relative px-6 pb-2 min-h-[120px] flex items-center justify-center">
        {respondSuccess ? (
          <div className="w-full flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center mb-3">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 dark:from-cyan-700 dark:to-blue-700 shadow text-white text-2xl">
                <Sparkles className="w-7 h-7" />
              </span>
            </div>
            <div className="text-xl font-bold text-teal-700 dark:text-cyan-300 mb-2">{t('seller.respondModalSuccessTitle')}</div>
            <div className="text-base text-[var(--muted)] dark:text-cyan-200/80">{t('seller.respondModalSuccessDesc')}</div>
          </div>
        ) : (
          <>
            <textarea
              className="w-full p-4 rounded-xl border-2 border-teal-200 dark:border-cyan-700 bg-teal-50 dark:bg-gray-800 text-[var(--text)] dark:text-cyan-100 resize-none pr-14 text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-cyan-700 transition-all shadow"
              rows={5}
              placeholder={t('seller.respondModalTextareaPlaceholder')}
              value={respondMessage}
              onChange={e => setRespondMessage(e.target.value)}
              disabled={respondLoading}
            />
            <button
              type="button"
              className="absolute top-4 right-8 bg-gradient-to-br from-teal-200 to-cyan-200 dark:from-cyan-800 dark:to-blue-900 text-teal-700 dark:text-cyan-200 rounded-full p-2 shadow-lg hover:bg-teal-300 dark:hover:bg-cyan-900 focus:outline-none border border-teal-300 dark:border-cyan-700 transition-colors"
              title={t('seller.respondModalMicTooltip')}
              disabled={respondLoading}
              onClick={handleMicRespond}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v-1.5m0-13.5a3.75 3.75 0 013.75 3.75v6a3.75 3.75 0 01-7.5 0v-6A3.75 3.75 0 0112 3.75zm0 0v13.5m6-6a6 6 0 11-12 0" />
              </svg>
            </button>
          </>
        )}
      </div>
      {/* Action Buttons */}
      {!respondSuccess && (
        <div className="flex gap-3 justify-end px-6 pb-6 pt-2">
          <button
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-cyan-100 font-semibold shadow hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all"
            onClick={() => setRespondModalOpen(false)}
            disabled={respondLoading}
          >{t('seller.respondModalCancel')}</button>
          <button
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-cyan-700 dark:to-blue-700 text-white font-bold shadow-lg hover:from-teal-600 hover:to-cyan-700 dark:hover:from-cyan-800 dark:hover:to-blue-800 transition-all disabled:opacity-60"
            onClick={handleSendResponse}
            disabled={respondLoading || !respondMessage}
          >{t('seller.respondModalSend')}</button>
        </div>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  )
}
