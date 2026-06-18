'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import { ShoppingCart, LogOut, Menu, X, Palette, Moon, Sun, User, Video, Gift, Heart, LayoutDashboard, Package, Bell, ChevronRight, MessageCircle } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import Leaderboard from './Leaderboard'

import { useTranslation } from 'react-i18next';
import { translateText } from '@/lib/translate';
import Image from 'next/image';
import '@/lib/i18n';

export default function Navbar() {
  // Navbar onboarding tour steps (responsive)
  const getNavbarTourSteps = () => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    if (isMobile) {
      return [
        {
          element: '#navbar-brand-mobile',
          intro: '<span style="font-size:1.2em">💜 <b>Welcome to KalaMitra!</b></span><br/>This is your <b>main navigation bar</b> to explore features.'
        },
        {
          element: '#navbar-mobile-theme-toggle',
          intro: '<span style="font-size:1.1em">🌗 <b>Theme</b></span><br/>Switch between light and dark mode.'
        },
        {
          element: '#navbar-leaderboard',
          intro: '<span style="font-size:1.1em">🥇 <b>Leaderboard</b></span><br/>See top contributors and winners.'
        },
        {
          element: '#navbar-mobile-reels',
          intro: '<span style="font-size:1.1em">🎬 <b>Reels</b></span><br/>Watch creative reels and ads.'
        },
        {
          element: 'a[href="/profile"]',
          intro: '<span style="font-size:1.1em">👤 <b>Profile</b></span><br/>View and edit your profile.'
        },
        {
          element: 'button.p-3.rounded-2xl',
          intro: '<span style="font-size:1.1em">☰ <b>Menu</b></span><br/>Open the menu to access more features.'
        },
      ];
    } else {
      return [
        {
          element: '.heritage-title',
          intro: '<span style="font-size:1.2em">💜 <b>Welcome to KalaMitra!</b></span><br/>This is your <b>main navigation bar</b> to explore features.'
        },
        {
          element: 'a[href="/marketplace"]',
          intro: '<span style="font-size:1.1em">🛍️ <b>Marketplace</b></span><br/>Browse and shop unique products.'
        },
        {
          element: 'a[href="/reels"]',
          intro: '<span style="font-size:1.1em">🎬 <b>Reels</b></span><br/>Watch creative reels and ads.'
        },
        {
          element: 'a[href="/auctions"]',
          intro: '<span style="font-size:1.1em">🏆 <b>Auctions</b></span><br/>Participate in live auctions.'
        },
        {
          element: 'a[href="/leaderboard"]',
          intro: '<span style="font-size:1.1em">🥇 <b>Leaderboard</b></span><br/>See top contributors and winners.'
        },
        {
          element: 'a[href="/cart"]',
          intro: '<span style="font-size:1.1em">🛒 <b>Cart</b></span><br/>View your shopping cart.'
        },
        {
          element: 'a[href="/gifts"]',
          intro: '<span style="font-size:1.1em">🎁 <b>Gifts</b></span><br/>Send and receive gifts.'
        },
        {
          element: 'button[aria-label="Toggle theme"]',
          intro: '<span style="font-size:1.1em">🌗 <b>Theme</b></span><br/>Switch between light and dark mode.'
        },
        {
          element: '#navbar-mobile-profile',
          intro: '<span style="font-size:1.1em">👤 <b>Profile</b></span><br/>View and edit your profile.'
        },
      ];
    }
  };

  // Auto-start Navbar Intro.js tour for new users (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('hasSeenKalaMitraNavbarIntro');
    if (!seen) {
      Promise.all([
        import('intro.js'),
      ]).then(([introJsModule]) => {
        const introJs = introJsModule.default;
        const steps = getNavbarTourSteps();
        // Wait for all step targets to exist
        const checkAllTargets = () => {
          const allExist = steps.every(step => step.element && document.querySelector(step.element));
          if (allExist) {
            introJs().setOptions({
              steps,
              showProgress: true,
              showBullets: false,
              exitOnOverlayClick: true,
              exitOnEsc: false,
              scrollToElement: true,
              overlayOpacity: 0.7,
              tooltipClass: 'kalamitra-intro-theme kalamitra-intro-theme-mobile',
              highlightClass: 'kalamitra-intro-highlight',
              nextLabel: 'Next →',
              prevLabel: '← Back',
              doneLabel: '✨ Done',
              skipLabel: 'Skip',
            })
              .oncomplete(() => {
                localStorage.setItem('hasSeenKalaMitraNavbarIntro', 'true');
              })
              .onexit(() => {
                localStorage.setItem('hasSeenKalaMitraNavbarIntro', 'true');
              })
              .start();
          } else {
            setTimeout(checkAllTargets, 100);
          }
        };
        checkAllTargets();
      });
    }
  }, []);

  const { user, profile, signOut, session, loading } = useAuth();
  const { currentLanguage, changeLanguage, isLoading: languageLoading } = useLanguage();
  const { theme, toggle } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [translatedName, setTranslatedName] = useState('');
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [mitraPoints, setMitraPoints] = useState<number | null>(null);
  const [hasLiveAuctions, setHasLiveAuctions] = useState(false)
  const { i18n, t } = useTranslation();
  // Unread notifications count
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  // Unwrapped gifts count
  const [unwrappedGiftsCount, setUnwrappedGiftsCount] = useState(0);
  // Gifts red dot (mobile)
  const [showMobileGiftDot, setShowMobileGiftDot] = useState(false);
  // Notifications popup state
  const [notificationsPopupOpen, setNotificationsPopupOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  // New notification toast
  const [newNotificationToast, setNewNotificationToast] = useState<{ title: string; body: string } | null>(null);
  // Mobile notification indicator - red dot for new notifications
  const [showMobileNotificationDot, setShowMobileNotificationDot] = useState(false);
  // Fetch unwrapped gifts count and subscribe to real-time updates and custom event
  useEffect(() => {
    if (!user?.id) {
      setUnwrappedGiftsCount(0);
      setShowMobileGiftDot(false);
      return;
    }
    let unsubscribed = false;
    const fetchUnwrappedGifts = async () => {
      try {
        const response = await fetch(`/api/gift?userId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch gifts');
        const data = await response.json();
        const count = data.received?.filter((g: any) => !g.viewed).length || 0;
        if (!unsubscribed) {
          setUnwrappedGiftsCount(count || 0);
          if ((count || 0) > 0) setShowMobileGiftDot(true);
        }
      } catch (err) {
        if (!unsubscribed) setUnwrappedGiftsCount(0);
      }
    };
    fetchUnwrappedGifts();
    // Listen for custom event for immediate updates
    const handleGiftUpdate = () => {
      fetchUnwrappedGifts();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('giftUpdated', handleGiftUpdate);
    }
    // Subscribe to real-time gifts
    const channel = supabase
      .channel(`gifts:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gifts',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Optimistically update count
          if (payload.eventType === 'INSERT') {
            setUnwrappedGiftsCount((prev) => {
              const next = prev + 1;
              if (next > 0) setShowMobileGiftDot(true);
              return next;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new?.viewed === true && payload.old?.viewed === false) {
            setUnwrappedGiftsCount((prev) => {
              const next = Math.max(0, prev - 1);
              if (next === 0) setShowMobileGiftDot(false);
              return next;
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.viewed === false) {
            setUnwrappedGiftsCount((prev) => {
              const next = Math.max(0, prev - 1);
              if (next === 0) setShowMobileGiftDot(false);
              return next;
            });
          }
        }
      )
      .subscribe();
    // Reliable polling fallback for all users to ensure UI syncs
    const pollInterval = setInterval(() => {
      if (!unsubscribed) fetchUnwrappedGifts();
    }, 5000);

    return () => {
      unsubscribed = true;
      channel.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('giftUpdated', handleGiftUpdate);
      }
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  // Fetch unread notifications count and subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) {
      setUnreadNotificationsCount(0);
      return;
    }

    const fetchUnreadNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        const count = data.notifications?.filter((n: any) => !n.read).length || 0;
        const unreadCount = count || 0;
        setUnreadNotificationsCount(unreadCount);
        // Show mobile red dot if there are unread notifications
        if (unreadCount > 0 && !showMobileNotificationDot) {
          setShowMobileNotificationDot(true);
        }
      } catch (err) {
        console.error('Error fetching unread notifications:', err);
      }
    };

    fetchUnreadNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`navbar_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setNewNotificationToast({
              title: payload.new.title,
              body: payload.new.body,
            });
            setShowMobileNotificationDot(true);
            setTimeout(() => setNewNotificationToast(null), 5000);
          }
          // Safely refetch the true unread count instead of relying on payload.old
          fetchUnreadNotifications();
        }
      )
      .on('broadcast', { event: 'new_notification' }, (payload: any) => {
        const note = payload.payload.notification;
        if (note) {
          setNewNotificationToast({
            title: note.title,
            body: note.body,
          });
          setShowMobileNotificationDot(true);
          setTimeout(() => setNewNotificationToast(null), 5000);
        }
        fetchUnreadNotifications();
      })
      .subscribe();

    // Listen for custom event for immediate updates (cross-component sync without network delay)
    const handleNotificationUpdate = () => {
      fetchUnreadNotifications();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('notificationUpdated', handleNotificationUpdate);
    }

    // Reliable polling fallback for all users to ensure UI syncs
    const pollInterval = setInterval(fetchUnreadNotifications, 5000);

    return () => {
      channel.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('notificationUpdated', handleNotificationUpdate);
      }
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  // Fetch notifications when popup opens
  useEffect(() => {
    if (!notificationsPopupOpen || !user?.id) return;
    let isMounted = true;

    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        if (isMounted) setNotifications(data.notifications?.slice(0, 10) || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        if (isMounted) setNotifications([]);
      } finally {
        if (isMounted) setNotificationsLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notification updates
    const channel = supabase
      .channel(`notifications-popup:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          // Refetch after a small delay to ensure data consistency
          setTimeout(() => {
            fetchNotifications();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [notificationsPopupOpen, user?.id]);

  // Close notifications popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationsPopupOpen(false);
      }
    };

    if (notificationsPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notificationsPopupOpen]);

  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: notificationId })
      });
      // Refetch notifications
      const response = await fetch(`/api/notifications?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications?.slice(0, 10) || []);

      // Refetch exact count since data only has 10 items
      if (user?.id) {
        const unreadCount = data.notifications?.filter((n: any) => !n.read).length || 0;
        setUnreadNotificationsCount(unreadCount);
        if (unreadCount === 0) setShowMobileNotificationDot(false);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'assamese', label: 'অসমীয়া', flag: '🇮🇳' },
    { code: 'bengali', label: 'বাংলা', flag: '🇮🇳' },
    { code: 'bodo', label: 'बर’ / बड़ो', flag: '🇮🇳' },
    { code: 'dogri', label: 'डोगरी', flag: '🇮🇳' },
    { code: 'gujarati', label: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'kannad', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'kashmiri', label: 'کٲشُر / कश्मीरी', flag: '🇮🇳' },
    { code: 'konkani', label: 'कोंकणी', flag: '🇮🇳' },
    { code: 'maithili', label: 'मैथिली', flag: '🇮🇳' },
    { code: 'malyalam', label: 'മലയാളം', flag: '🇮🇳' },
    { code: 'manipuri', label: 'ꯃꯦꯇꯩꯂꯣꯟ (Meitei)', flag: '🇮🇳' },
    { code: 'marathi', label: 'मराठी', flag: '🇮🇳' },
    { code: 'nepali', label: 'नेपाली', flag: '🇳🇵' },
    { code: 'oriya', label: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    { code: 'punjabi', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'sanskrit', label: 'संस्कृत', flag: '🇮🇳' },
    { code: 'santhali', label: 'ᱥᱟᱱᱛᱟᱲᱤ', flag: '🇮🇳' },
    { code: 'sindhi', label: 'سنڌي / सिंधी', flag: '🇮🇳' },
    { code: 'tamil', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'telgu', label: 'తెలుగు', flag: '🇮🇳' },
    { code: 'urdu', label: 'اردو', flag: '🇵🇰' },
  ];

  // Ensure client-side rendering to prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileDropdownOpen])

  // Poll for live auctions every 30s
  useEffect(() => {
    fetchLiveAuctions();
    const auctionIv = setInterval(() => {
      fetchLiveAuctions();
    }, 30000);
    return () => {
      clearInterval(auctionIv);
    };
  }, [user?.id]);

  // Translate user name when profile or language changes
  useEffect(() => {
    const translateUserName = async () => {
      if (profile?.name && currentLanguage) {
        try {
          const translated = await translateText(profile.name, currentLanguage)
          setTranslatedName(translated)
        } catch {
          setTranslatedName(profile.name)
        }
      } else {
        setTranslatedName(profile?.name || '')
      }
    }
    translateUserName()
  }, [profile?.name, currentLanguage])

  // Fetch MitraPoints for signed-in user (10 MP per auction won)
  useEffect(() => {
    let mounted = true
    const fetchPoints = async () => {
      if (!user?.id) {
        if (mounted) setMitraPoints(null)
        return
      }
      try {
        // count auctions where user is winner
        const { count, error } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('winner_id', user.id)
        if (error) {
          console.error('fetchPoints error', error)
          if (mounted) setMitraPoints(null)
          return
        }
        const wins = (count || 0)
        const pts = wins * 10
        if (mounted) setMitraPoints(pts)
      } catch (err) {
        console.error('fetchPoints failed', err)
        if (mounted) setMitraPoints(null)
      }
    }
    fetchPoints()
    return () => { mounted = false }
  }, [user?.id])



  const fetchLiveAuctions = async () => {
    try {
      const now = new Date().toISOString()
      const { count } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'running').gt('ends_at', now)
      setHasLiveAuctions((count || 0) > 0)
    } catch (err) {
      console.error('failed to fetch live auctions', err)
    }
  }

  // Cart item count state
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    async function fetchCartCount() {
      if (!user?.id) {
        // For anonymous users, get count from localStorage
        try {
          const { getAnonymousCartCount } = await import('@/utils/cart');
          setCartCount(getAnonymousCartCount());
        } catch {
          setCartCount(0);
        }
        return;
      }
      // For logged-in users, get count from database
      try {
        const { count, error } = await supabase
          .from('cart')
          .select('*', { count: 'exact', head: true })
          .eq('buyer_id', user.id);
        setCartCount(count || 0);
      } catch {
        setCartCount(0);
      }
    }
    fetchCartCount();

    // Poll for cart changes every 2 seconds for both logged-in and anonymous users
    const interval = setInterval(fetchCartCount, 2000);

    // Listen for custom cartUpdated event for immediate updates
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdate);
    }

    // Listen for storage events (for anonymous users in different tabs)
    let handleStorageChange: (() => void) | null = null;
    if (!user?.id && typeof window !== 'undefined') {
      handleStorageChange = () => {
        fetchCartCount();
      };
      window.addEventListener('storage', handleStorageChange);
    }

    // Subscribe to real-time cart changes for logged-in users
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (user?.id) {
      channel = supabase
        .channel(`cart:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart',
            filter: `buyer_id=eq.${user.id}`,
          },
          () => {
            fetchCartCount();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      if (handleStorageChange) {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user?.id]);

  // Prevent hydration mismatch by showing consistent structure during loading
  if (!mounted) {
    return (
      <nav className="glass-nav border-b border-heritage-gold/40 shadow-soft sticky top-0 z-50 heritage-bg">
        <div className="container-custom">
          <div className="flex justify-between items-center py-4">
            {/* Logo placeholder */}
            <div className="flex items-center space-x-4 group">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <Image src="/kalamitra-symbol.png" alt="KalaMitra Symbol" width={56} height={56} className="object-contain w-auto h-auto" />
              </div>
              <span className="text-3xl font-bold heritage-title">{t('brand.name')}</span>
            </div>
            {/* navbar placeholder */}
            <div className="hidden md:flex items-center space-x-10">
              <Link href="/leaderboard" className="p-2 rounded-xl hover:bg-heritage-gold/50">
                <span className="block w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                    <defs>
                      <linearGradient id="trophyGold" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFD700" />
                        <stop offset="1" stopColor="#FFB300" />
                      </linearGradient>
                    </defs>
                    <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold)" stroke="#B8860B" strokeWidth="1.2" />
                    <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1" />
                    <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1" />
                    <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                    <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                  </svg>
                </span>
              </Link>
              {/* Leaderboard Trophy icon (desktop only) */}
              <Link href="/leaderboard" className="p-2 rounded-xl hover:bg-heritage-gold/50">
                <span className="block w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                    <defs>
                      <linearGradient id="trophyGold2" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFD700" />
                        <stop offset="1" stopColor="#FFB300" />
                      </linearGradient>
                    </defs>
                    <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold2)" stroke="#B8860B" strokeWidth="1.2" />
                    <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1" />
                    <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1" />
                    <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                    <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                  </svg>
                </span>
              </Link>
              <div className="w-20 h-8 bg-[var(--bg-2)] rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-[var(--bg-2)] rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }



  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }


  // Language change handler
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
  };

  return (
    <nav className="glass-nav border-b border-heritage-gold/20 shadow-soft sticky top-0 z-50 font-display">
      <div className="container-custom font-display">
        <div className="flex justify-between items-center py-3">
          {/* Logo - Short brand for mobile, full for desktop */}
          <div className="flex items-center space-x-4 group">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="relative w-14 h-14 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                <Image src="/kalamitra-symbol.png" alt="KalaMitra Symbol" width={56} height={56} className="object-contain drop-shadow-md w-auto h-auto" priority />
              </div>
              <span className="text-3xl font-extrabold heritage-title hidden md:inline" key={`brand-${currentLanguage}`}>{t('brand.name')}</span>
              {/* Mobile: Show "KM" when signed in, "KalaMitra" when not */}
              <span id="navbar-brand-mobile" className="text-2xl font-extrabold heritage-title md:hidden" key={`brand-short-${currentLanguage}`}>
                {user ? 'KM' : t('brand.name')}
              </span>
            </Link>
          </div>

          {/* Desktop navbar */}
          <div className="hidden md:flex items-center space-x-10">
            {/* ...existing code... */}
            <Link
              href="/reels"
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group flex items-center px-3 py-2"
              title="Reels"
            >
              <Video className="w-6 h-6 mr-2" />
              <span className="text-base">{t('navbar.reels')}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/marketplace"
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group"
            >
              <span className="relative z-10">{t('navbar.marketplace')}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/leaderboard" className="p-2 rounded-xl hover:bg-heritage-gold/50">
              <span className="block w-6 h-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <defs>
                    <linearGradient id="trophyGold3" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFD700" />
                      <stop offset="1" stopColor="#FFB300" />
                    </linearGradient>
                  </defs>
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold3)" stroke="#B8860B" strokeWidth="1.2" />
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1" />
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1" />
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                </svg>
              </span>
            </Link>
            <Link
              href="/auctions"
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group"
            >
              <span className="relative z-10">{t('navbar.auctions') || 'Auctions'}</span>
              {hasLiveAuctions && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full">{t('navbar.live') || 'LIVE'}</span>
              )}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
            </Link>
            {loading ? (
              <div className="flex items-center space-x-6">
                <div className="w-20 h-8 bg-[var(--bg-2)] rounded animate-pulse"></div>
                <div className="w-20 h-8 bg-[var(--bg-2)] rounded animate-pulse"></div>
              </div>
            ) : user ? (
              <>
                {/* Dashboard only for sellers, no placeholder for buyers */}
                {profile?.role === 'seller' && (
                  <Link
                    href="/dashboard"
                    className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group"
                  >
                    <span className="relative z-10">{t('navbar.dashboard')}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
                {/* Cart, Gifts, Notifications, Theme, Profile always present */}
                <Link
                  href="/cart"
                  className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium relative hover:scale-105 transform hover:translate-y-[-2px] group"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse-glow">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/gifts"
                  className="text-[var(--text)] hover:text-pink-600 transition-all duration-300 font-medium relative hover:scale-105 transform hover:translate-y-[-2px] group"
                  title={t('navbar.gifts')}
                >
                  <Gift className="w-6 h-6" />
                  {unwrappedGiftsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse z-10 shadow-lg">
                      {unwrappedGiftsCount > 99 ? '99+' : unwrappedGiftsCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center space-x-6">
                  {/* Notifications Icon (desktop) */}
                  <div className="relative" ref={notificationsDropdownRef}>
                    <button
                      onClick={() => setNotificationsPopupOpen(!notificationsPopupOpen)}
                      className="p-2 rounded-xl hover:bg-heritage-gold/50 transition-colors relative"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5 text-[var(--text)]" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse z-10 shadow-lg">{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</span>
                      )}
                    </button>

                    {/* Notifications Popup */}
                    <AnimatePresence>
                      {notificationsPopupOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-96 z-50 origin-top-right"
                        >
                          <div className="bg-[var(--bg-2)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-3)]/50 flex items-center justify-between">
                              <h3 className="font-bold text-[var(--text)]">{t('navbar.notifications') || 'Notifications'}</h3>
                              <button
                                onClick={() => setNotificationsPopupOpen(false)}
                                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                              >
                                ×
                              </button>
                            </div>

                            {/* Notifications List */}
                            <div className="max-h-96 overflow-y-auto">
                              {notificationsLoading ? (
                                <div className="p-6 text-center">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-[var(--heritage-gold)] border-t-transparent rounded-full mx-auto"
                                  />
                                </div>
                              ) : notifications.length === 0 ? (
                                <div className="p-6 text-center">
                                  <Bell className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-30" />
                                  <p className="text-xs text-[var(--muted)]">{t('common.noData') || 'No notifications'}</p>
                                </div>
                              ) : (
                                <div className="divide-y divide-[var(--border)]">
                                  {notifications.map((notif) => (
                                    <div
                                      key={notif.id}
                                      className={`p-4 transition-all duration-200 border-l-4 ${notif.read
                                        ? 'border-l-transparent bg-[var(--bg-1)]'
                                        : 'border-l-blue-500 bg-[var(--bg-2)]'
                                        } hover:bg-[var(--bg-3)]`}
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-sm text-[var(--text)] mb-1">{notif.title}</h4>
                                          <p className="text-xs text-[var(--muted)] mb-2 line-clamp-2">{notif.body}</p>
                                          <p className="text-xs text-[var(--muted)]">
                                            {new Date(notif.created_at).toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                        {!notif.read && (
                                          <button
                                            onClick={() => markNotificationRead(notif.id)}
                                            className="flex-shrink-0 px-3 py-1 ml-2 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 transition-colors shadow"
                                            title="Mark as read"
                                          >
                                            Mark as read
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                              <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-1)]">
                                <Link
                                  href="/notifications"
                                  className="text-xs font-semibold text-[var(--heritage-gold)] hover:text-[#d4af37] transition-colors block text-center py-2"
                                  onClick={() => setNotificationsPopupOpen(false)}
                                >
                                  {t('common.viewAll') || 'View All Notifications'} →
                                </Link>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Theme Toggle (Desktop) */}
                  <button
                    onClick={() => toggle()}
                    className="p-2 rounded-xl hover:bg-heritage-gold/50 transition-all duration-300 hover:scale-105"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-[var(--text)]" />
                    ) : (
                      <Moon className="w-5 h-5 text-[var(--text)]" />
                    )}
                  </button>
                  {/* Profile dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      id="navbar-mobile-profile"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-heritage-gold/20 transition-all duration-200"
                    >
                      {profile?.profile_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.profile_image} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-heritage-gold to-heritage-red text-white flex items-center justify-center font-semibold">
                          {profile?.name ? profile.name.split(' ').map(s => s[0]).slice(0, 2).join('') : <User className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-[var(--text)]">{translatedName || profile?.name}</div>
                          {mitraPoints != null && (
                            <div title="MitraPoints" className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{mitraPoints} {t('navbar.mitraPoints')}</div>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{profile?.role || ''}</div>
                      </div>
                    </button>

                    {/* Profile Dropdown Modal */}
                    <AnimatePresence>
                      {profileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-72 z-50 origin-top-right"
                        >
                          <div className="bg-[var(--bg-2)]/95 backdrop-blur-xl rounded-2xl shadow-2xl p-0 border border-[var(--border)] overflow-hidden ring-1 ring-black/5">
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-3)]/50">
                              <div className="flex items-center space-x-3">
                                {profile?.profile_image ? (
                                  <img src={profile.profile_image} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-[var(--heritage-gold)]" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-heritage-gold to-heritage-red text-white flex items-center justify-center font-bold text-lg shadow-inner">
                                    {profile?.name ? profile.name.split(' ').map(s => s[0]).slice(0, 2).join('') : <User className="w-6 h-6" />}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[var(--text)] truncate">{translatedName || profile?.name}</div>
                                  <div className="text-xs text-[var(--muted)] capitalize">{profile?.role || 'User'}</div>
                                </div>
                              </div>
                              {mitraPoints !== null && (
                                <div className="mt-3 flex items-center justify-between bg-[var(--bg-1)] p-2 rounded-lg border border-[var(--border)]">
                                  <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">MitraPoints</span>
                                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{mitraPoints}</span>
                                </div>
                              )}
                            </div>

                            {/* Menu Items */}
                            <div className="p-2 space-y-1">
                              {/* Dashboard Link (Sellers Only) */}
                              {profile?.role === 'seller' && (
                                <Link
                                  href="/dashboard"
                                  onClick={() => setProfileDropdownOpen(false)}
                                  className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--bg-3)] transition-colors group text-sm"
                                >
                                  <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-800 group-hover:border-amber-400 transition-colors">
                                    <LayoutDashboard className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:text-amber-500" />
                                  </div>
                                  <span className="text-[var(--text)] font-medium">{t('navbar.sellerDashboard')}</span>
                                </Link>
                              )}

                              <Link
                                href="/profile"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--bg-3)] transition-colors group text-sm"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-1)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--heritage-gold)] transition-colors">
                                  <User className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heritage-gold)]" />
                                </div>
                                <span className="text-[var(--text)] font-medium">{t('navbar.myProfile')}</span>
                              </Link>

                              <Link
                                href="/profile?tab=orders" // Assuming profile has tabs, or just profile/orders if that page existed. But profile page seems to handle orders.
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--bg-3)] transition-colors group text-sm"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-1)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--heritage-gold)] transition-colors">
                                  <Package className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heritage-gold)]" />
                                </div>
                                <span className="text-[var(--text)] font-medium">{t('navbar.myOrders')}</span>
                              </Link>

                              <Link
                                href="/wishlist"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--bg-3)] transition-colors group text-sm"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-1)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--heritage-gold)] transition-colors">
                                  <Heart className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heritage-gold)]" />
                                </div>
                                <span className="text-[var(--text)] font-medium">{t('navbar.wishlist', { defaultValue: 'Wishlist' })}</span>
                              </Link>

                              <Link
                                href="/dm"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--bg-3)] transition-colors group text-sm"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-1)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--heritage-gold)] transition-colors">
                                  <MessageCircle className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heritage-gold)]" />
                                </div>
                                <span className="text-[var(--text)] font-medium">{t('navbar.messages', { defaultValue: 'Messages' })}</span>
                              </Link>

                              {/* Language Selector */}
                              <div className="pt-2 mt-2 border-t border-[var(--border)]">
                                <div className="flex items-center space-x-3 w-full px-3 py-2 rounded-xl">
                                  <div className="w-8 h-8 rounded-full bg-[var(--bg-1)] flex items-center justify-center border border-[var(--border)]">
                                    <Palette className="w-4 h-4 text-[var(--muted)]" />
                                  </div>
                                  <select
                                    value={currentLanguage}
                                    onChange={handleLanguageChange}
                                    className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heritage-gold)]"
                                  >
                                    {languages.map(lang => (
                                      <option key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <button
                                onClick={async () => {
                                  setProfileDropdownOpen(false);
                                  await handleSignOut();
                                }}
                                className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group text-sm mt-1"
                              >
                                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center border border-transparent group-hover:border-red-200 dark:group-hover:border-red-800 transition-colors">
                                  <LogOut className="w-4 h-4 text-red-500" />
                                </div>
                                <span className="text-red-600 font-medium">{t('navbar.signOut')}</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-6">
                {/* Theme Toggle (Desktop) */}
                <button
                  onClick={() => toggle()}
                  className="p-2 rounded-xl hover:bg-heritage-gold/50 transition-all duration-300 hover:scale-105"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-[var(--text)]" />
                  ) : (
                    <Moon className="w-5 h-5 text-[var(--text)]" />
                  )}
                </button>
                <Link
                  href="/auth/signin"
                  className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] px-4 py-2 rounded-xl hover:bg-heritage-gold/50"
                >
                  {t('navbar.signIn')}
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-primary text-sm px-8 py-3"
                >
                  {t('auth.signupTitle')}
                </Link>
              </div>
            )}
            {/* Language Selector removed from Navbar */}
          </div>

          {/* Mobile theme toggle (visible on small screens) */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Messages moved to profile page */}
            {/* Profile image icon for mobile, always at top left of menu */}
            {user && (
              <Link href="/profile" className="mr-2 flex items-center justify-center">
                {profile?.profile_image ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-blue-400">
                    <Image
                      src={profile.profile_image}
                      alt="avatar"
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold border-2 border-blue-400">
                    {profile?.name ? profile.name[0] : <User className="w-5 h-5" />}
                  </div>
                )}
              </Link>
            )}
            {/* Leaderboard button (mobile) */}
            <Link id="navbar-leaderboard" href="/leaderboard" className="p-2 rounded-xl hover:bg-heritage-gold/50">
              <span className="block w-6 h-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <defs>
                    <linearGradient id="trophyGoldMobile" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFD700" />
                      <stop offset="1" stopColor="#FFB300" />
                    </linearGradient>
                  </defs>
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGoldMobile)" stroke="#B8860B" strokeWidth="1.2" />
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1" />
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1" />
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none" />
                </svg>
              </span>
            </Link>
            {/* Reels button (mobile) - in menu, icon always black */}
            <Link href="/reels" className="p-2 rounded-xl flex items-center justify-center" title="Reels">
              < Video id="navbar-mobile-reels" className="w-6 h-6 text-black" />
            </Link>
            {/* Theme toggle (mobile) */}
            <button
              id='navbar-mobile-theme-toggle'
              onClick={() => toggle()}
              className="theme-toggle p-1"
              data-theme={theme}
              aria-label="Toggle theme"
            >
              <div className="knob" />
            </button>
            {/* Mobile menu button with red dot if new notification */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  if (!isMenuOpen) {
                    setShowMobileNotificationDot(false);
                  }
                }}
                className="relative p-3 rounded-2xl text-[var(--text)] hover:text-heritage-gold hover:bg-heritage-gold/50 transition-all duration-300 hover:scale-105"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {showMobileNotificationDot && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-lg shadow-red-600/50 z-20"
                />
              )}
            </div>
          </div>

          {/* Leaderboard modal removed: always use /leaderboard page */}
        </div>

        {/* Mobile navbar */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-[var(--bg-2)]/95 backdrop-blur-xl rounded-b-[2rem] shadow-2xl"
            >
              <div className="p-4 space-y-2 max-h-[85vh] overflow-y-auto pb-10 scrollbar-hide">
                <style jsx global>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                  .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}</style>
                {/* User Context Header (if logged in) */}
                {user && (
                  <div className="px-4 py-4 mb-4 bg-gradient-to-br from-[var(--bg-3)] to-[var(--bg-1)] rounded-3xl border border-heritage-gold/10 shadow-sm flex items-center justify-between relative group">
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 flex-1"
                    >
                      {profile?.profile_image ? (
                        <img src={profile.profile_image} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-heritage-gold" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-heritage-gold to-heritage-red text-white flex items-center justify-center font-bold text-lg">
                          {profile?.name ? profile.name.split(' ').map(s => s[0]).slice(0, 2).join('') : <User className="w-6 h-6" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--text)] truncate">{translatedName || profile?.name}</div>
                        <div className="text-xs text-[var(--muted)] capitalize flex items-center gap-1">
                          {profile?.role || 'Guest'}
                          <ChevronRight className="w-3 h-3 text-orange-500" />
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                      {mitraPoints !== null && (
                        <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                          <span className="text-[10px] font-bold text-amber-600 block leading-tight">POINTS</span>
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-none">{mitraPoints}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/marketplace"
                    className="flex items-center space-x-3 px-5 py-4 bg-[var(--bg-1)] rounded-2xl hover:bg-[var(--bg-3)] transition-all border border-transparent active:scale-95"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-bold text-[var(--text)] text-sm">{t('navbar.marketplace')}</span>
                  </Link>

                  <Link
                    href="/auctions"
                    className="flex items-center space-x-3 px-5 py-4 bg-[var(--bg-1)] rounded-2xl hover:bg-[var(--bg-3)] transition-all border border-transparent active:scale-95"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="font-bold text-[var(--text)] text-sm">{t('navbar.auctions') || 'Auctions'}</span>
                    {hasLiveAuctions && (
                      <span className="ml-auto px-2 py-0.5 bg-red-600 text-[10px] text-white font-bold rounded-lg animate-pulse">LIVE</span>
                    )}
                  </Link>

                  <Link
                    href="/reels"
                    className="flex items-center space-x-3 px-5 py-4 bg-[var(--bg-1)] rounded-2xl hover:bg-[var(--bg-3)] transition-all border border-transparent active:scale-95"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                      <Video className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-bold text-[var(--text)] text-sm">{t('navbar.reels')}/{t('navbar.ads')}</span>
                  </Link>

                  {user ? (
                    <>
                      {profile?.role === 'seller' && (
                        <Link
                          href="/dashboard"
                          className="flex items-center space-x-3 px-5 py-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl hover:bg-orange-100/50 transition-all border border-orange-100/50 dark:border-orange-900/20 active:scale-95"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-orange-600" />
                          </div>
                          <span className="font-bold text-orange-700 dark:text-orange-400 text-sm">{t('navbar.dashboard')}</span>
                        </Link>
                      )}

                      {/* Language Selector (Now above the actions grid) */}
                      <div className="mt-4 mb-2">
                        <div className="bg-[var(--bg-3)]/50 p-3 rounded-2xl border border-[var(--border)]">
                          <div className="flex items-center space-x-2 mb-2 px-1">
                            <Palette className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-wider">{t('navbar.language') || 'Language'}</span>
                          </div>
                          <div className="relative">
                            <select
                              value={currentLanguage}
                              onChange={handleLanguageChange}
                              className="w-full h-10 px-4 bg-[var(--bg-1)] border border-[var(--border)] rounded-xl text-[var(--text)] text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition-all shadow-sm"
                            >
                              {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.flag} {lang.label}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                              <ChevronRight className="w-3 h-3 rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Link
                          href="/notifications"
                          className="flex flex-col items-center justify-center p-4 bg-[var(--bg-1)] rounded-2xl border border-[var(--border)] active:scale-95 relative"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowMobileNotificationDot(false);
                          }}
                        >
                          <div className="relative">
                            <Bell className="w-6 h-6 text-[var(--text)] mb-2" />
                            {unreadNotificationsCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md border-2 border-[var(--bg-1)]">
                                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{t('navbar.notifications') || 'Alerts'}</span>
                        </Link>

                        <Link
                          href="/cart"
                          className="flex flex-col items-center justify-center p-4 bg-[var(--bg-1)] rounded-2xl border border-[var(--border)] active:scale-95 relative"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="relative">
                            <ShoppingCart className="w-6 h-6 text-[var(--text)] mb-2" />
                            {cartCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md border-2 border-[var(--bg-1)]">
                                {cartCount}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{t('navbar.cart')}</span>
                        </Link>

                        <Link
                          href="/gifts"
                          className="flex flex-col items-center justify-center p-4 bg-pink-50/30 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20 active:scale-95 relative"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="relative">
                            <Gift className="w-6 h-6 text-pink-500 mb-2" />
                            {unwrappedGiftsCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md border-2 border-pink-50/50">
                                {unwrappedGiftsCount > 99 ? '99+' : unwrappedGiftsCount}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">{t('navbar.gifts')}</span>
                        </Link>

                        <Link
                          href="/wishlist"
                          className="flex flex-col items-center justify-center p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 active:scale-95 relative"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Heart className="w-6 h-6 text-red-500 mb-2" />
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('profile.wishlist')}</span>
                        </Link>

                        <Link
                          href="/dm"
                          className="flex flex-col items-center justify-center p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 active:scale-95 relative"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <MessageCircle className="w-6 h-6 text-blue-500 mb-2" />
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Messages</span>
                        </Link>
                      </div>

                      <div className="pt-4 mt-2 border-t border-[var(--border)] flex flex-col space-y-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-3 px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors group w-full text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">{t('navbar.signOut')}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col space-y-3 pt-4 border-t border-[var(--border)]">
                      <Link
                        href="/auth/signin"
                        className="w-full py-4 text-center font-bold text-[var(--text)] bg-[var(--bg-1)] border border-[var(--border)] rounded-2xl active:scale-95 transition-transform"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t('navbar.signIn')}
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="w-full py-4 text-center font-bold text-white bg-gradient-to-r from-orange-600 to-heritage-red rounded-2xl shadow-lg active:scale-95 transition-transform"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t('auth.signupTitle')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      {/* Messages section moved to profile page */}

      {/* New Notification Toast */}
      <AnimatePresence>
        {newNotificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] max-w-sm"
          >
            <div className="bg-[var(--bg-2)] border-l-4 border-blue-500 rounded-xl shadow-2xl p-4 flex gap-4 items-start backdrop-blur-md">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)]">{newNotificationToast.title}</h3>
                <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{newNotificationToast.body}</p>
              </div>
              <button
                onClick={() => setNewNotificationToast(null)}
                className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
