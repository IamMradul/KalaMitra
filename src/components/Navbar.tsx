'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/components/LanguageProvider'
import { ShoppingCart, LogOut, Menu, X, Palette, Bell, Moon, Sun, User, Video, Gift } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import Leaderboard from './Leaderboard'
import { supabase } from '@/lib/supabase'

import NotificationsList from '@/components/NotificationsList'
import { useTranslation } from 'react-i18next';
import { translateText } from '@/lib/translate';
import '@/lib/i18n';

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth()
  const { currentLanguage, changeLanguage, isLoading: languageLoading } = useLanguage()
  const { theme, toggle } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [translatedName, setTranslatedName] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const [mitraPoints, setMitraPoints] = useState<number | null>(null)
  const [hasLiveAuctions, setHasLiveAuctions] = useState(false)
  const { i18n, t } = useTranslation();
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

  // Poll for live auctions every 30s and notifications every 5s for real-time badge
  useEffect(() => {
    fetchLiveAuctions()
    const auctionIv = setInterval(() => {
      fetchLiveAuctions()
    }, 30000)
    let notifIv: NodeJS.Timeout | null = null;
    if (user?.id) {
      fetchUnread(user.id)
      notifIv = setInterval(() => {
        fetchUnread(user.id)
      }, 5000)
    }
    return () => {
      clearInterval(auctionIv)
      if (notifIv) clearInterval(notifIv)
    }
  }, [user?.id])

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

  const fetchUnread = async (uid?: string | null) => {
    if (!uid) return setUnreadCount(0)
    try {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false)
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('failed fetch unread', err)
    }
  }

  const fetchLiveAuctions = async () => {
    try {
      const now = new Date().toISOString()
      const { count } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'running').gt('ends_at', now)
      setHasLiveAuctions((count || 0) > 0)
    } catch (err) {
      console.error('failed to fetch live auctions', err)
    }
  }


  // Prevent hydration mismatch by showing consistent structure during loading
  if (!mounted) {
    return (
      <nav className="glass-nav border-b border-heritage-gold/40 shadow-soft sticky top-0 z-50 heritage-bg">
        <div className="container-custom">
          <div className="flex justify-between items-center py-6">
            {/* Logo placeholder */}
            <div className="flex items-center space-x-4 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-gold)] rounded-2xl flex items-center justify-center">
                <Palette className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold heritage-title">KalaMitra</span>
            </div>
            {/* Navigation placeholder */}
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
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold)" stroke="#B8860B" strokeWidth="1.2"/>
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1"/>
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1"/>
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
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
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold2)" stroke="#B8860B" strokeWidth="1.2"/>
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1"/>
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1"/>
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
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
    <nav className="glass-nav border-b border-heritage-gold/40 shadow-soft sticky top-0 z-50 heritage-bg">
      <div className="container-custom">
        <div className="flex justify-between items-center py-6">
          {/* Logo - Short brand for mobile, full for desktop */}
          <div className="flex items-center space-x-4 group">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-medium hover:shadow-glow animate-float-slow border-2 border-heritage-gold">
                <Palette className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold heritage-title hidden md:inline" key={`brand-${currentLanguage}`}>{t('brand.name')}</span>
              <span className="text-3xl font-bold heritage-title md:hidden" key={`brand-short-${currentLanguage}`}>KM</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
                      {/* ...existing code... */}
            <Link 
              href="/reels" 
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group flex items-center px-3 py-2" 
              title="Reels"
            >
              <Video className="w-6 h-6 mr-2" />
              <span className="text-base">{t('navigation.reels')}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link 
              href="/marketplace" 
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group"
            >
              <span className="relative z-10">{t('navigation.marketplace')}</span>
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
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGold3)" stroke="#B8860B" strokeWidth="1.2"/>
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1"/>
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1"/>
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                </svg>
              </span>
            </Link>
            <Link 
              href="/auctions" 
              className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] relative group"
            >
                <span className="relative z-10">{t('navigation.auctions') || 'Auctions'}</span>
                {hasLiveAuctions && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full">{t('navigation.live') || 'LIVE'}</span>
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
                    <span className="relative z-10">{t('navigation.dashboard')}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-heritage-gold to-heritage-red transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
                {/* Cart, Gifts, Notifications, Theme, Profile always present */}
                <Link 
                  href="/cart" 
                  className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium relative hover:scale-105 transform hover:translate-y-[-2px] group"
                >
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-heritage-gold to-heritage-red text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-medium animate-pulse-glow">
                    0
                  </span>
                </Link>
                <Link 
                  href="/gifts" 
                  className="text-[var(--text)] hover:text-pink-600 transition-all duration-300 font-medium relative hover:scale-105 transform hover:translate-y-[-2px] group"
                  title="Gifts"
                >
                  <Gift className="w-6 h-6" />
                </Link>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <button onClick={() => { setNotifOpen(!notifOpen); fetchUnread(user?.id) }} className="p-2 rounded-xl hover:bg-heritage-gold/50">
                      <Bell className="w-5 h-5 text-[var(--text)]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 z-50">
                        <div className="card rounded shadow-lg p-3 relative max-h-[60vh] overflow-y-auto">
                          <button
                            className="absolute top-2 right-2 text-[var(--muted)] hover:text-red-500 text-lg font-bold rounded-full px-2 py-1 transition-all"
                            onClick={() => setNotifOpen(false)}
                            aria-label="Close notifications"
                          >
                            ×
                          </button>
                          <NotificationsList />
                        </div>
                      </div>
                    )}
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
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-heritage-gold/20 transition-all duration-200"
                    >
                      {profile?.profile_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.profile_image} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-heritage-gold to-heritage-red text-white flex items-center justify-center font-semibold">
                          {profile?.name ? profile.name.split(' ').map(s=>s[0]).slice(0,2).join('') : <User className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-[var(--text)]">{translatedName || profile?.name}</div>
                          {mitraPoints != null && (
                            <div title="MitraPoints" className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{mitraPoints} MP</div>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{profile?.role || ''}</div>
                      </div>
                    </button>
                    
                    {/* Profile Dropdown Modal */}
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 z-50">
                        <div className="card-glass rounded-2xl shadow-2xl p-4 border border-[var(--border)] bg-[var(--bg)]">
                          <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-[var(--border)]">
                            {profile?.profile_image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={profile.profile_image} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-heritage-gold to-heritage-red text-white flex items-center justify-center font-semibold text-lg">
                                {profile?.name ? profile.name.split(' ').map(s=>s[0]).slice(0,2).join('') : <User className="w-6 h-6" />}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[var(--text)]">{translatedName || profile?.name}</div>
                              <div className="text-sm text-[var(--muted)]">{profile?.role || ''}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Link 
                              href="/profile"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-[var(--bg-2)] transition-all duration-200 group"
                            >
                              <User className="w-5 h-5 text-[var(--muted)] group-hover:text-heritage-gold" />
                              <span className="text-[var(--text)] font-medium">View Profile</span>
                            </Link>
                            
                            <button 
                              onClick={async () => { 
                                setProfileDropdownOpen(false);
                                await signOut(); 
                              }}
                              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                            >
                              <LogOut className="w-5 h-5 text-red-500 group-hover:text-red-600" />
                              <span className="text-red-600 font-medium">Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-6">
                <Link 
                  href="/auth/signin"
                  className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium hover:scale-105 transform hover:translate-y-[-2px] px-4 py-2 rounded-xl hover:bg-heritage-gold/50"
                >
                  {t('navigation.signin')}
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
            {/* Profile image icon for mobile, always at top left of menu */}
            {user && (
              <Link href="/profile" className="mr-2 flex items-center justify-center">
                {profile?.profile_image ? (
                  <img src={profile.profile_image} alt="avatar" className="w-9 h-9 rounded-full object-cover border-2 border-blue-400" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold border-2 border-blue-400">
                    {profile?.name ? profile.name[0] : <User className="w-5 h-5" />}
                  </div>
                )}
              </Link>
            )}
            {/* Leaderboard button (mobile) */}
            <Link href="/leaderboard" className="p-2 rounded-xl hover:bg-heritage-gold/50">
              <span className="block w-6 h-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <defs>
                    <linearGradient id="trophyGoldMobile" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFD700" />
                      <stop offset="1" stopColor="#FFB300" />
                    </linearGradient>
                  </defs>
                  <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 3.866-3.134 7-7 7s-7-3.134-7-7V5a1 1 0 0 1 1-1h3z" fill="url(#trophyGoldMobile)" stroke="#B8860B" strokeWidth="1.2"/>
                  <ellipse cx="12" cy="19" rx="5" ry="2.5" fill="#FFF8DC" stroke="#B8860B" strokeWidth="1.1"/>
                  <rect x="9" y="15" width="6" height="3" rx="1.2" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1"/>
                  <path d="M4 7c0 2.5 1.5 4.5 4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                  <path d="M20 7c0 2.5-1.5 4.5-4 5.5" stroke="#B8860B" strokeWidth="1.1" fill="none"/>
                </svg>
              </span>
            </Link>
            {/* Reels button (mobile) - in menu, icon always black */}
            <Link href="/reels" className="p-2 rounded-xl flex items-center justify-center" title="Reels">
              <Video className="w-6 h-6 text-black" />
            </Link>
            {/* Theme toggle (mobile) */}
            <button
              onClick={() => toggle()}
              className="theme-toggle p-1"
              data-theme={theme}
              aria-label="Toggle theme"
            >
              <div className="knob" />
            </button>
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-3 rounded-2xl text-[var(--text)] hover:text-heritage-gold hover:bg-heritage-gold/50 transition-all duration-300 hover:scale-105"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

  {/* Leaderboard modal removed: always use /leaderboard page */}
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-heritage-gold/50 bg-[var(--bg-2)]/95 backdrop-blur-md rounded-3xl mt-4 shadow-medium animate-slide-in-up text-[var(--text)]">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/marketplace" 
                className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.marketplace')}
              </Link>
              <Link 
                href="/auctions" 
                className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="inline-flex items-center">
                  {t('navigation.auctions') || 'Auctions'}
                  {hasLiveAuctions && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full">{t('navigation.live') || 'LIVE'}</span>
                  )}
                </span>
              </Link>
              {/* Reels/Ads icon - enabled, no background, always black icon */}
              <Link href="/reels" className="flex items-center px-6 py-3" onClick={() => setIsMenuOpen(false)}>
                <Video className="w-6 h-6 text-black mr-3" />
                <span className="font-medium text-black">{t('navigation.reels')}/{t('navigation.ads')}</span>
              </Link>
          {loading ? (
                <div className="space-y-4">
            <div className="w-32 h-8 bg-[var(--bg-2)] rounded animate-pulse mx-6"></div>
            <div className="w-32 h-8 bg-[var(--bg-2)] rounded animate-pulse mx-6"></div>
                </div>
              ) : user ? (
                <>
                  {profile?.role === 'seller' && (
                    <Link 
                      href="/dashboard" 
                      className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navigation.dashboard')}
                    </Link>
                  )}
                  <Link 
                    href="/notifications" 
                    className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.notifications') || 'Notifications'}
                  </Link>
                  <Link 
                    href="/cart" 
                    className="text-[var(--text)] hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.cart')}
                  </Link>
                  <Link 
                    href="/gifts" 
                    className="text-[var(--text)] hover:text-pink-600 transition-all duration-300 font-medium px-6 py-3 hover:bg-pink-100 rounded-2xl hover:translate-x-2 transform flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Gift className="w-5 h-5" />
                    Gifts
                  </Link>
                    <div className="pt-4 border-t border-heritage-gold/50 px-6">
                    <span className="text-[var(--text)] font-medium block mb-3 px-4 py-2 bg-[var(--bg-2)] rounded-xl backdrop-blur-sm">
                      {translatedName || profile?.name}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 text-[var(--text)] hover:text-heritage-gold transition-all duration-300 px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl w-full hover:translate-x-2 transform"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('navigation.signout')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col space-y-4 pt-4 border-t border-heritage-gold/50 px-6">
                  <Link 
                    href="/auth/signin"
                    className="text-gray-700 hover:text-heritage-gold transition-all duration-300 font-medium px-6 py-3 hover:bg-heritage-gold/50 rounded-2xl hover:translate-x-2 transform"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.signin')}
                  </Link>
                  <Link 
                    href="/auth/signup"
                    className="btn-primary text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('auth.signupTitle')}
                  </Link>
                </div>
              )}

              {/* Mobile Language Selector removed from Navbar */}
              {/* Mobile Theme Toggle */}
              <div className="pt-4 px-6">
                <label className="block text-sm text-gray-600 mb-2">{t('navigation.theme') || 'Theme'}</label>
                <div>
                  <button
                    onClick={() => { toggle(); }}
                    className="theme-toggle"
                    data-theme={theme}
                    aria-pressed={theme === 'dark'}
                    aria-label="Toggle theme"
                  >
                    <div className="knob" />
                    <div className="text-xs font-medium ml-2">{theme === 'dark' ? (t('navigation.dark') || 'Dark') : (t('navigation.light') || 'Light')}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
