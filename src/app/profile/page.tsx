'use client'
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../components/LanguageProvider';
import { Sun, Moon, LogOut, Mic, User, Edit3, Camera, Globe, Palette, Award, Package, Truck, Heart, Lock, ShoppingBag, MapPin, CreditCard, Star, Shield, MessageCircle, Share2, Users, Calendar, TrendingUp, CheckCircle, Clock, Gift, Crown, Gem, Sparkles } from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';
import { useTranslation } from 'react-i18next';
import Link from 'next/link'
import type { Product } from '../../types/product';

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export default function ProfilePage() {
  const [listeningField, setListeningField] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Map app language to BCP-47 code
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
    // Short codes
    as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
  }

  const handleStartListening = (field: string) => {
    const speechLang = langMap[currentLanguage] || currentLanguage || 'en-IN'
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert(t('profile.speechRecognitionNotSupported'))
      return
    }
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionCtor) {
    alert('Speech recognition not supported in this browser.')
    return
  }
  const recognition: SpeechRecognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      if (field === 'name') {
        setForm(f => ({ ...f, name: f.name ? f.name + ' ' + transcript : transcript }))
      } else if (field === 'bio') {
        setForm(f => ({ ...f, bio: f.bio ? f.bio + ' ' + transcript : transcript }))
      }
    }
    recognition.onerror = (event: Event) => {
      setListeningField(null)
    }
    recognition.onend = () => {
      setListeningField(null)
    }
    recognitionRef.current = recognition
    recognition.start()
    setListeningField(field)
  }
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListeningField(null)
    }
  }
  // Full language list (should match Navbar)
  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'assamese', label: 'অসমীয়া', flag: '🇮🇳' },
    { code: 'bengali', label: 'বাংলা', flag: '🇮🇳' },
    { code: 'bodo', label: 'बर\' / बड़ो', flag: '🇮🇳' },
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

  const { user, profile, loading, signOut } = useAuth();
  const [form, setForm] = useState({ name: '', bio: '', profile_image: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Enhanced profile state
  // Default to 'buying' for buyers; 'selling' for sellers
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'wishlist'>(profile?.role === 'seller' ? 'selling' : 'buying');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followersLoading, setFollowersLoading] = useState(true);

  // Share helpers
  const getShareUrl = () => {
    if (typeof window === 'undefined' || !user?.id) return '';
    return `https://kalaaamitra.vercel.app/profile/${user.id}`;
  };

  const handleCopyLink = async () => {
    try {
      const url = getShareUrl();
      if (!url) return;
      await navigator.clipboard.writeText(url);
      // brief visual feedback by closing modal after copy
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
        await navigator.share({ title: profile?.name || t('profile.title'), text: t('profile.checkOutProfile'), url });
        setShowShareModal(false);
        return;
      } catch {
        // fall through to web intents
      }
    }
    // Fallback: open WhatsApp web intent
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

  // Ensure buyers don't land on an empty 'selling' tab
  useEffect(() => {
    if (profile?.role !== 'seller' && activeTab === 'selling') {
      setActiveTab('buying');
    }
  }, [profile?.role]);

  const { t } = useTranslation();
  
  // Real user data from profile and database
  // Seller achievements
  const sellerAchievements = [
    { name: t('profile.topSeller'), icon: Crown, color: 'var(--trust-gold)' },
    { name: t('profile.qualityMaster'), icon: Gem, color: 'var(--emerald)' },
    { name: t('profile.customerFavorite'), icon: Heart, color: 'var(--maroon)' }
  ];
  // Buyer achievements (example, replace with actual as desired)
  const buyerAchievements = [
    { name: t('profile.enthusiastBuyer'), icon: ShoppingBag, color: 'var(--heritage-gold)' },
    { name: t('profile.wishlistStar'), icon: Heart, color: 'var(--heritage-red)' }
  ];
  const userProfileData = {
    isSeller: profile?.role === 'seller' || false,
    isVerified: false,
    trustScore: 4.5,
    yearsActive: Math.floor((Date.now() - new Date(profile?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 365)) || 0,
    completedTransactions: 0,
    specialization: profile?.role === 'seller' ? t('profile.general') : '',
    region: t('profile.india'),
    languages: [t('profile.english')],
    achievements: profile?.role === 'seller' ? sellerAchievements : buyerAchievements,
    reviews: {
      average: 4.5,
      count: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    stats: {
      itemsListed: 0,
      itemsSold: 0,
      wishlistItems: 0,
      followers: 0,
      following: 0
    }
  };
  const router = useRouter();
  const { currentLanguage, changeLanguage, isLoading: languageLoading } = useLanguage();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (profile) {
      console.log('Profile data:', profile); // Debug log
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        profile_image: profile.profile_image || '',
      });
    }
  }, [profile]);

  // Fetch seller's products if seller
  useEffect(() => {
    const fetchMyProducts = async () => {
      if (!userProfileData.isSeller || !user?.id) {
        setSellerProducts([])
        return;
      }
      setProductsLoading(true);
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      setSellerProducts((products as Product[]) || []);
      setProductsLoading(false);
    };
    fetchMyProducts();
  }, [userProfileData.isSeller, user]);

  // Fetch followers count and isFollowing status
  useEffect(() => {
    const fetchFollowers = async () => {
      if (!profile?.id || !user?.id) return;
      setFollowersLoading(true);
      // Count followers
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      setFollowersCount(count || 0);
      // Is current user following this profile?
      const { data: existing } = await supabase
        .from('followers')
        .select('*')
        .eq('user_id', profile.id)
        .eq('follower_id', user.id)
        .maybeSingle();
      setIsFollowing(!!existing);
      setFollowersLoading(false);
    };
    fetchFollowers();
  }, [profile?.id, user?.id]);

  // Follow/Unfollow action
  const handleFollowClick = async () => {
    if (!profile?.id || !user?.id || profile.id === user.id) return;
    setFollowersLoading(true);
    if (isFollowing) {
      // Unfollow
      await supabase
        .from('followers')
        .delete()
        .eq('user_id', profile.id)
        .eq('follower_id', user.id);
      setFollowersCount(f => Math.max(0, f - 1));
      setIsFollowing(false);
    } else {
      // Follow
      await supabase
        .from('followers')
        .insert({ user_id: profile.id, follower_id: user.id });
      setFollowersCount(f => f + 1);
      setIsFollowing(true);
    }
    setFollowersLoading(false);
  };

  // Handle "Add New Item"/List Products click: redirect if no products
  const handleListProductClick = () => {
    if (!sellerProducts.length) {
      router.push('/dashboard');
    }
  };

  if (loading) return <div className="container-custom py-10">{t('common.loading')}</div>;
  if (!user) return <div className="container-custom py-10">{t('profile.signInPrompt')}</div>;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('profile.newPasswordsDoNotMatch'));
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      setEditPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert(t('profile.passwordUpdatedSuccessfully'));
    } catch (error) {
      alert(t('profile.errorUpdatingPassword'));
    }
    setChangingPassword(false);
  };


  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      bio: form.bio,
      profile_image: form.profile_image,
    }).eq('id', user.id);
    setSaving(false);
    if (!error) setEdit(false);
  };

  // Handle avatar click to trigger file input
  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Handle file input change and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Always use .jpg if no extension
      let ext = file.name.split('.').pop();
      if (!ext || ext.length > 5) ext = 'jpg';
      const fileName = `profile-images/${user.id}.${ext}`;
      // Delete all previous profile images for this user (any ext)
      const { data: listData } = await supabase.storage.from('images').list('profile-images');
      if (listData && Array.isArray(listData)) {
        for (const f of listData) {
          if (f.name.startsWith(user.id)) {
            await supabase.storage.from('images').remove([`profile-images/${f.name}`]);
          }
        }
      }
      // Upload new image (no restrictions)
      const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      // Get public URL and update profile immediately
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
  // Add cache-busting param to force browser to fetch new image
  const cacheBustedUrl = `${urlData.publicUrl}?cb=${Date.now()}`;
  setForm(f => ({ ...f, profile_image: cacheBustedUrl }));
      // Update profile in DB right after upload
      await supabase.from('profiles').update({ profile_image: urlData.publicUrl }).eq('id', user.id);
    } catch (err) {
      // Optionally show error
    }
    setUploading(false);
  };

  return (
    <main className="min-h-screen heritage-bg relative overflow-hidden">
      {/* Traditional Indian Background Pattern */}
      <div className="absolute inset-0 indian-pattern opacity-5"></div>
      
      {/* Floating Decorative Elements - Theme Aware */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--saffron)]/20 to-[var(--turquoise)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-[var(--maroon)]/20 to-[var(--royal-blue)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
      
      <div className="container-custom py-6 md:py-8 max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Enhanced Header with Traditional Elements */}
        <div className="text-center mb-8">
          <div className="inline-block rangoli-gradient p-1 rounded-2xl mb-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text)] bg-[var(--bg-2)] px-6 py-3 rounded-xl">
              <span className="bg-gradient-to-r from-[var(--saffron)] to-[var(--maroon)] bg-clip-text text-transparent">
                मेरी प्रोफ़ाइल
              </span>
              <span className="text-[var(--text)] ml-2">{t('profile.myProfile')}</span>
            </h1>
          </div>
          <p className="text-sm md:text-base text-[var(--muted)] max-w-2xl mx-auto">
            {t('profile.headerDesc')} - {t('profile.celebratingHeritage')}
          </p>
        </div>

        {/* Main Profile Card with Traditional Indian Design - Theme Optimized */}
        <div className="card-glass p-6 md:p-8 mb-8 rounded-3xl shadow-2xl hover-lift">
          <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8">
            
            {/* Enhanced Avatar with Traditional Frame - Theme Aware */}
            <div className="relative group">
              <div className="avatar-indian-frame">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Click to change profile image">
                  {form.profile_image ? (
                    <img 
                      src={form.profile_image} 
                      alt="avatar" 
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover bg-[var(--bg-2)] border-2 border-[var(--border)]" 
                      onError={(e) => {
                        console.log('Image failed to load:', form.profile_image);
                        // Hide the image and show fallback
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', form.profile_image);
                      }}
                    />
                  ) : null}
                  {!form.profile_image && (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[var(--saffron)] via-[var(--turquoise)] to-[var(--maroon)] flex items-center justify-center text-2xl md:text-3xl font-bold text-white border-2 border-[var(--border)]">
                      {form.name?.[0] || <User className="w-8 h-8 md:w-12 md:h-12" />}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[var(--saffron)] to-[var(--maroon)] text-white text-xs rounded-full px-2 py-1 opacity-90 group-hover:opacity-100 shadow-lg font-semibold border border-white/20">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
              </div>
              
              {/* Verification Badge - Theme Aware */}
              {userProfileData.isVerified && (
                <div className="absolute -top-2 -right-2 verified-badge px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/20">
                  <CheckCircle className="w-3 h-3" />
                  {t('profile.verified')}
                </div>
              )}
            </div>

            {/* Enhanced Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2">{form.name}</h2>
                  
                  {/* Seller/Buyer Badge & Specialization */}
                  <div className="flex items-center gap-2 mb-3">
                    {userProfileData.isSeller ? (
                      <div className="specialization-badge px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Gem className="w-4 h-4" />
                        {t('profile.seller')}
                      </div>
                    ) : (
                      <div className="btn-indian-secondary px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        {t('profile.buyer')}
                      </div>
                    )}
                    {/* Specialization: only for sellers */}
                    {userProfileData.isSeller && (
                      <div className="craft-badge-banarasi px-3 py-1 rounded-full text-sm font-semibold">
                        {userProfileData.specialization}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Trust Score (Only for sellers) */}
                {userProfileData.isSeller && (
                  <div className="text-center md:text-right">
                    <div className="trust-score text-2xl md:text-3xl font-bold mb-1">
                      {userProfileData.trustScore.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center md:justify-end gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(userProfileData.trustScore) ? 'text-[var(--trust-gold)] fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="text-sm text-[var(--muted)] ml-1">({userProfileData.reviews.count})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Location and Languages */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-[var(--muted)]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{userProfileData.region}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>{userProfileData.languages.join(', ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{userProfileData.yearsActive} {t('profile.yearsActive')}</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm md:text-base text-[var(--muted)] mb-6 line-clamp-3">
                {form.bio || <span className="text-[var(--muted)]/60 italic">{t('profile.passionateAbout')}</span>}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  className="btn-indian-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base"
                  onClick={() => setEdit(true)}
                >
                  <Edit3 className="w-4 h-4" />
                  {t('profile.editProfile')}
                </button>
                
                {profile?.id !== user?.id && (
                  <button 
                    className={`btn-indian-secondary px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base ${followersLoading ? 'opacity-60 pointer-events-none' : ''}`}
                    onClick={handleFollowClick}
                    disabled={followersLoading}
                  >
                    <Users className="w-4 h-4" />
                    {isFollowing ? t('profile.following') : t('profile.follow')}
                  </button>
                )}
                
                <button 
                  className="px-4 py-2 rounded-xl border-2 border-[var(--saffron)]/30 text-[var(--saffron)] hover:bg-[var(--saffron)]/10 transition-all duration-200 flex items-center gap-2 text-sm md:text-base"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4" />
                  {t('profile.share')}
                </button>
              </div>
            </div>
          </div>

          {/* Achievement Badges (role-specific) */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--saffron)]" />
              {t('profile.achievements')}
            </h3>
            <div className="flex flex-wrap gap-3">
              {userProfileData.achievements.map((achievement, index) => (
                <div key={index} className="achievement-badge px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                  <achievement.icon className="w-4 h-4" style={{color: achievement.color}} />
                  {achievement.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid: Items Listed/Sold only for sellers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          {userProfileData.isSeller && (
            <>
              <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--saffron)] to-[var(--saffron-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-[var(--text)] mb-1">{sellerProducts.length}</div>
                <div className="text-sm text-[var(--muted)]">{t('profile.itemsListed')}</div>
              </div>
              <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--emerald)] to-[var(--emerald-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.itemsSold}</div>
                <div className="text-sm text-[var(--muted)]">{t('profile.itemsSold')}</div>
              </div>
            </>
          )}
          {/* Wishlist and Followers for all */}
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--maroon)] to-[var(--maroon-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.wishlistItems}</div>
            <div className="text-sm text-[var(--muted)]">{t('profile.wishlist')}</div>
          </div>
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--royal-blue)] to-[var(--royal-blue-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">
              {followersLoading ? <span className="animate-pulse text-[var(--muted)]">...</span> : followersCount}
            </div>
            <div className="text-sm text-[var(--muted)]">{t('profile.followers')}</div>
          </div>
        </div>

        {/* Tab Navigation: Render tabs based on role */}
        <div className="flex flex-wrap gap-2 mb-6">
          {userProfileData.isSeller && (
            <button
              key="selling"
              onClick={() => setActiveTab('selling')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base font-semibold transition-all duration-200 ${activeTab === 'selling' ? 'btn-indian-primary' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'}`}
            >
              <Package className="w-4 h-4" />
              {t('profile.selling')}
            </button>
          )}
          <button
            key="buying"
            onClick={() => setActiveTab('buying')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base font-semibold transition-all duration-200 ${activeTab === 'buying' ? 'btn-indian-primary' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('profile.buying')}
            <span className="ml-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow">
                <Clock className="w-3 h-3" /> {t('profile.comingSoon')}
              </span>
            </span>
          </button>
          <button
            key="wishlist"
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base font-semibold transition-all duration-200 ${activeTab === 'wishlist' ? 'btn-indian-primary' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'}`}
          >
            <Heart className="w-4 h-4" />
            {t('profile.wishlist')}
            <span className="ml-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow">
                <Clock className="w-3 h-3" /> {t('profile.comingSoon')}
              </span>
            </span>
          </button>
        </div>

          {/* Tab Content: Selling tab only for sellers */}
          <div className="min-h-[300px]">
            {activeTab === 'selling' && userProfileData.isSeller && (
              productsLoading ? (
                <div className="text-center py-12 text-[var(--muted)]">{t('profile.loadingProducts')}</div>
              ) : sellerProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sellerProducts.map(product => (
                    <Link href={`/product/${product.id}`} key={product.id}>
                      <div className="bg-[var(--bg-2)] text-[var(--text)] rounded-xl shadow-lg border border-[var(--border)] p-4 hover:shadow-xl hover:border-[var(--saffron)]/50 cursor-pointer flex flex-col items-center transition-colors">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-28 h-28 object-cover rounded-lg mb-2" />
                        ) : (
                          <div className="w-28 h-28 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg mb-2">{t('profile.noImage')}</div>
                        )}
                        <div className="font-bold text-base text-center mb-1 line-clamp-1">{product.name}</div>
                        <div className="text-sm text-[var(--muted)] mb-1 line-clamp-2 text-center">{product.description}</div>
                        <div className="font-bold text-orange-600 dark:text-orange-300">₹{product.price}</div>
                        <div className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">{product.category}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('profile.noListedProductsYet')}</h3>
                  <p className="text-[var(--muted)] mb-6">{t('profile.startListing')}</p>
                  <button className="btn-indian-primary px-6 py-3 rounded-xl" onClick={handleListProductClick}>
                    {t('profile.addNewItem')}
                  </button>
                </div>
              )
            )}
            {activeTab === 'buying' && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('profile.purchaseHistory')}</h3>
                <span className="flex justify-center mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow">
                    <Clock className="w-3 h-3" /> {t('profile.comingSoon')}
                  </span>
                </span>
                <p className="text-[var(--muted)] mb-6">{t('profile.trackOrders')}</p>
                <button className="btn-indian-secondary px-6 py-3 rounded-xl" disabled>
                  {t('profile.viewOrders')}
                </button>
              </div>
            )}
            {activeTab === 'wishlist' && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2">{t('profile.yourWishlist')}</h3>
                <span className="flex justify-center mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow">
                    <Clock className="w-3 h-3" /> {t('profile.comingSoon')}
                  </span>
                </span>
                <p className="text-[var(--muted)] mb-6">{t('profile.saveFavorite')}</p>
                <button className="btn-indian-secondary px-6 py-3 rounded-xl" disabled>
                  {t('profile.browseItems')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced E-commerce Features Grid - Theme Optimized */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* My Orders */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--saffron)]/30" onClick={() => router.push('/orders')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--royal-blue)] to-[var(--royal-blue-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.myOrders')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.orderHistory')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow"><Clock className="w-3 h-3" /> {t('profile.comingSoon')}</span>
            </div>
          </div>

          {/* Track Package */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--emerald)]/30" onClick={() => router.push('/track')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--emerald)] to-[var(--emerald-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.trackPackage')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.trackShipments')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow"><Clock className="w-3 h-3" /> {t('profile.comingSoon')}</span>
            </div>
          </div>

          {/* Reviews & Ratings */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--trust-gold)]/30" onClick={() => router.push('/reviews')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--trust-gold)] to-[var(--saffron)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.reviews')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.customerFeedback')}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1">
                <Star className="w-3 h-3 text-[var(--trust-gold)] fill-current" />
                <span className="text-sm font-semibold"><span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded font-semibold">{t('profile.comingSoon')}</span></span>
              </div>
              <span className="text-xs text-[var(--muted)]">({userProfileData.reviews.count} reviews)</span>
            </div>
          </div>

          {/* Change Password */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--maroon)]/30" onClick={() => setEditPassword(true)}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--maroon)] to-[var(--maroon-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.security')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.changePassword')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--verified-green)] font-semibold">{t('profile.secure')}</span>
            </div>
          </div>

          {/* Address Book */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--turquoise)]/30" onClick={() => router.push('/addresses')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--turquoise)] to-[var(--turquoise-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.addresses')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.manageAddresses')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow"><Clock className="w-3 h-3" /> {t('profile.comingSoon')}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--saffron)]/30" onClick={() => router.push('/payment-methods')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--saffron)] to-[var(--saffron-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.payments')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.cardsWallets')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--saffron)]/10 to-[var(--bg-2)] text-[var(--saffron)] border border-[var(--saffron)]/40 font-semibold text-xs shadow"><Clock className="w-3 h-3" /> {t('profile.comingSoon')}</span>
            </div>
          </div>
        </div>

        {/* Settings Grid - Enhanced Theme Optimized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Language Settings */}
          <div className="card-glass p-4 md:p-6 hover-lift rounded-2xl">
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.language')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.chooseLanguage')}</p>
              </div>
            </div>
            <select
              className="w-full px-3 py-2 rounded-lg border-2 border-[var(--heritage-gold)]/30 bg-[var(--bg-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base"
              value={currentLanguage}
              onChange={e => changeLanguage(e.target.value)}
              disabled={languageLoading}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[var(--bg-2)] text-[var(--text)]">{lang.flag} {lang.label}</option>
              ))}
            </select>
          </div>

          {/* Theme Settings */}
          <div className="card-glass p-4 md:p-6 hover-lift rounded-2xl">
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">{t('profile.theme')}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">{t('profile.appearance')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text)] font-medium text-sm">
                {theme === 'dark' ? t('profile.darkMode') : t('profile.lightMode')}
              </span>
              <button 
                onClick={toggle} 
                className="p-2 rounded-lg border-2 border-[var(--heritage-gold)]/30 bg-[var(--heritage-gold)]/10 text-[var(--heritage-gold)] transition-all duration-300 hover:scale-110 hover:bg-[var(--heritage-gold)]/20"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions - Enhanced & Repositioned */}
        <div className="card-glass p-4 md:p-6 rounded-2xl border border-red-200/20 bg-gradient-to-br from-red-50/10 to-pink-50/10 dark:from-red-900/10 dark:to-pink-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <LogOut className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text)] text-base md:text-lg">{t('profile.accountManagement')}</h3>
                <p className="text-sm text-[var(--muted)]">{t('profile.secureAccount')}</p>
              </div>
            </div>
            <button 
              onClick={async () => { await signOut(); router.push('/'); }} 
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white font-bold hover:scale-105 hover:shadow-lg transition-all duration-200 border border-red-400/20"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('profile.signOut')}</span>
            </button>
          </div>
        </div>
        {/* Edit Profile Modal - Enhanced Theme Optimized */}
        {edit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-glass p-4 md:p-6 max-w-md w-full animate-slide-in-up rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold text-[var(--text)] flex items-center">
                  <Edit3 className="w-4 h-4 md:w-5 md:h-5 mr-2 text-[var(--heritage-gold)]" />
                  {t('profile.editProfile')}
                </h3>
                <button
                  type="button"
                  onClick={() => setEdit(false)}
                  className="text-[var(--muted)] hover:text-[var(--heritage-red)] transition-colors text-lg md:text-xl p-1 rounded-full hover:bg-[var(--bg-2)]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">{t('profile.name')}</label>
                  <div className="relative">
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border-2 border-[var(--heritage-gold)]/30 rounded-lg p-2.5 md:p-3 pr-8 md:pr-10 bg-[var(--bg-2)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={listeningField === 'name' ? handleStopListening : () => handleStartListening('name')}
                      className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-[var(--heritage-gold)]/10 hover:bg-[var(--heritage-gold)]/20 transition-colors"
                      title={listeningField === 'name' ? t('profile.listening') : t('profile.speak')}
                    >
                      <Mic className={`w-3 h-3 md:w-4 md:h-4 ${listeningField === 'name' ? 'animate-pulse text-[var(--heritage-red)]' : 'text-[var(--heritage-gold)]'}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">{t('profile.bio')}</label>
                  <div className="relative">
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      className="w-full border-2 border-[var(--heritage-gold)]/30 rounded-lg p-2.5 md:p-3 pr-8 md:pr-10 bg-[var(--bg-2)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base resize-none"
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={listeningField === 'bio' ? handleStopListening : () => handleStartListening('bio')}
                      className="absolute right-1.5 md:right-2 top-2 md:top-2 p-1 rounded-full bg-[var(--heritage-gold)]/10 hover:bg-[var(--heritage-gold)]/20 transition-colors"
                      title={listeningField === 'bio' ? t('profile.listening') : t('profile.speak')}
                    >
                      <Mic className={`w-3 h-3 md:w-4 md:h-4 ${listeningField === 'bio' ? 'animate-pulse text-[var(--heritage-red)]' : 'text-[var(--heritage-gold)]'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 md:gap-3 justify-end pt-2 md:pt-4">
                  <button 
                    type="button" 
                    className="px-3 md:px-4 py-1.5 md:py-2 text-[var(--muted)] hover:text-[var(--heritage-red)] font-semibold transition-all duration-200 text-sm md:text-base" 
                    onClick={() => setEdit(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="btn-indian-primary px-4 md:px-6 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 text-sm md:text-base" 
                    disabled={saving || uploading}
                  >
                    {saving || uploading ? t('common.save') + '...' : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Change Password Modal - Enhanced Theme Optimized */}
        {editPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-glass p-4 md:p-6 max-w-md w-full animate-slide-in-up rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold text-[var(--text)] flex items-center">
                  <Lock className="w-4 h-4 md:w-5 md:h-5 mr-2 text-[var(--heritage-gold)]" />
                  {t('profile.changePassword')}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditPassword(false)}
                  className="text-[var(--muted)] hover:text-[var(--heritage-red)] transition-colors text-lg md:text-xl p-1 rounded-full hover:bg-[var(--bg-2)]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">{t('profile.currentPassword')}</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full border-2 border-[var(--heritage-gold)]/30 rounded-lg p-2.5 md:p-3 bg-[var(--bg-2)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">{t('profile.newPassword')}</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full border-2 border-[var(--heritage-gold)]/30 rounded-lg p-2.5 md:p-3 bg-[var(--bg-2)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">{t('profile.confirmNewPassword')}</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full border-2 border-[var(--heritage-gold)]/30 rounded-lg p-2.5 md:p-3 bg-[var(--bg-2)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)]/50 transition-all duration-200 text-sm md:text-base"
                    required
                  />
                </div>

                <div className="flex gap-2 md:gap-3 justify-end pt-2 md:pt-4">
                  <button 
                    type="button" 
                    className="px-3 md:px-4 py-1.5 md:py-2 text-[var(--muted)] hover:text-[var(--heritage-red)] font-semibold transition-all duration-200 text-sm md:text-base" 
                    onClick={() => setEditPassword(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="btn-indian-primary px-4 md:px-6 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 text-sm md:text-base" 
                    disabled={changingPassword}
                  >
                    {changingPassword ? t('profile.changing') : t('profile.changePassword')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Share Modal - Theme Optimized */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-glass p-4 md:p-6 max-w-md w-full animate-slide-in-up rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold text-[var(--text)] flex items-center">
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2 text-[var(--heritage-gold)]" />
                  {t('profile.share')} {t('profile.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--heritage-red)] transition-colors text-lg md:text-xl p-1 rounded-full hover:bg-[var(--bg-2)]"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-[var(--bg-2)] rounded-lg border border-[var(--border)]">
                  <p className="text-sm text-[var(--muted)] mb-2">{t('profile.profileLink')}:</p>
                  <p className="text-sm text-[var(--text)] break-all">{getShareUrl()}</p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={handleCopyLink}
                    className="btn-indian-primary flex-1 py-2 rounded-lg"
                  >
                    {t('profile.copyLink')}
                  </button>
                  <button 
                    type="button"
                    onClick={handleNativeShare}
                    className="btn-indian-secondary flex-1 py-2 rounded-lg"
                  >
                    {t('profile.share')}
                  </button>
                </div>

                {/* Social options */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button onClick={handleShareWhatsApp} className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-semibold hover:bg-[#25D366]/20">{t('profile.whatsapp')}</button>
                  <button onClick={handleShareTwitter} className="px-3 py-2 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/30 font-semibold hover:bg-[#1DA1F2]/20">{t('profile.twitter')}</button>
                  <button onClick={handleShareFacebook} className="px-3 py-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 font-semibold hover:bg-[#1877F2]/20">{t('profile.facebook')}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
  );
}