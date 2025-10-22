'use client'
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../components/LanguageProvider';
import { Sun, Moon, LogOut, Mic, User, Edit3, Camera, Globe, Palette, Award, Package, Truck, Heart, Lock, ShoppingBag, MapPin, CreditCard, Star, Shield, MessageCircle, Share2, Users, Calendar, TrendingUp, CheckCircle, Clock, Gift, Crown, Gem, Sparkles } from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';
import { useTranslation } from 'react-i18next';

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
      alert('Speech recognition not supported in this browser.')
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
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'wishlist'>('selling');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Real user data from profile and database
  const userProfileData = {
    isSeller: profile?.role === 'seller' || false,
    isVerified: false, // Will be implemented when verification system is added
    trustScore: 4.5, // Default trust score
    yearsActive: Math.floor((Date.now() - new Date(profile?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 365)) || 0,
    completedTransactions: 0, // Will be calculated from actual transactions
    specialization: 'General',
    region: 'India',
    languages: ['English'],
    achievements: [
      { name: 'Top Seller', icon: Crown, color: 'var(--trust-gold)' },
      { name: 'Quality Master', icon: Gem, color: 'var(--emerald)' },
      { name: 'Customer Favorite', icon: Heart, color: 'var(--maroon)' }
    ],
    reviews: {
      average: 4.5, // Default rating
      count: 0, // Will be calculated from actual reviews
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    stats: {
      itemsListed: 0, // Will be calculated from actual listings
      itemsSold: 0, // Will be calculated from actual sales
      wishlistItems: 0, // Will be calculated from actual wishlist
      followers: 0, // Will be calculated from actual followers
      following: 0 // Will be calculated from actual following
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

  const { t } = useTranslation();
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
      alert('New passwords do not match');
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
      alert('Password updated successfully');
    } catch (error) {
      alert('Error updating password');
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
                मेरा प्रोफाइल
              </span>
              <span className="text-[var(--text)] ml-2">My Profile</span>
            </h1>
          </div>
          <p className="text-sm md:text-base text-[var(--muted)] max-w-2xl mx-auto">
            {t('profile.headerDesc')} - Celebrating Indian Heritage & Craftsmanship
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
                  Verified
                </div>
              )}
            </div>

            {/* Enhanced Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2">{form.name}</h2>
                  
                  {/* Seller/Buyer Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    {userProfileData.isSeller ? (
                      <div className="specialization-badge px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Gem className="w-4 h-4" />
                        Seller
                      </div>
                    ) : (
                      <div className="btn-indian-secondary px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        Buyer
                      </div>
                    )}
                    
                    {/* Specialization Badge */}
                    <div className="craft-badge-banarasi px-3 py-1 rounded-full text-sm font-semibold">
                      {userProfileData.specialization}
                    </div>
                  </div>
                </div>
                
                {/* Trust Score */}
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
                  <span>{userProfileData.yearsActive} years active</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm md:text-base text-[var(--muted)] mb-6 line-clamp-3">
                {form.bio || <span className="text-[var(--muted)]/60 italic">Passionate about preserving and sharing the beauty of traditional Indian craftsmanship...</span>}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  className="btn-indian-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base"
                  onClick={() => setEdit(true)}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
                
                <button 
                  className="btn-indian-secondary px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base"
                  onClick={() => setIsFollowing(!isFollowing)}
                >
                  <Users className="w-4 h-4" />
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                
                <button 
                  className="px-4 py-2 rounded-xl border-2 border-[var(--saffron)]/30 text-[var(--saffron)] hover:bg-[var(--saffron)]/10 transition-all duration-200 flex items-center gap-2 text-sm md:text-base"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--saffron)]" />
              Achievements
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

        {/* Enhanced Stats Grid - Theme Optimized */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--saffron)] to-[var(--saffron-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.itemsListed}</div>
            <div className="text-sm text-[var(--muted)]">Items Listed</div>
          </div>
          
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--emerald)] to-[var(--emerald-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.itemsSold}</div>
            <div className="text-sm text-[var(--muted)]">Items Sold</div>
          </div>
          
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--maroon)] to-[var(--maroon-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.wishlistItems}</div>
            <div className="text-sm text-[var(--muted)]">Wishlist</div>
          </div>
          
          <div className="card-glass p-4 md:p-6 rounded-2xl text-center hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--royal-blue)] to-[var(--royal-blue-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">{userProfileData.stats.followers}</div>
            <div className="text-sm text-[var(--muted)]">Followers</div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="card-glass p-6 md:p-8 rounded-3xl shadow-2xl mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'selling', label: 'Selling', icon: Package, count: userProfileData.stats.itemsListed },
              { key: 'buying', label: 'Buying', icon: ShoppingBag, count: userProfileData.stats.itemsSold },
              { key: 'wishlist', label: 'Wishlist', icon: Heart, count: userProfileData.stats.wishlistItems }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'selling' | 'buying' | 'wishlist')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'btn-indian-primary'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === 'selling' && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Your Listed Items</h3>
                <p className="text-[var(--muted)] mb-6">Manage your traditional Indian crafts and products</p>
                <button className="btn-indian-primary px-6 py-3 rounded-xl">
                  Add New Item
                </button>
              </div>
            )}
            
            {activeTab === 'buying' && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Purchase History</h3>
                <p className="text-[var(--muted)] mb-6">Track your orders and discover more treasures</p>
                <button className="btn-indian-secondary px-6 py-3 rounded-xl">
                  View Orders
                </button>
              </div>
            )}
            
            {activeTab === 'wishlist' && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Your Wishlist</h3>
                <p className="text-[var(--muted)] mb-6">Save your favorite traditional items for later</p>
                <button className="btn-indian-secondary px-6 py-3 rounded-xl">
                  Browse Items
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
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">My Orders</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Order history</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-[var(--muted)]">12 orders</span>
            </div>
          </div>

          {/* Track Package */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--emerald)]/30" onClick={() => router.push('/track')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--emerald)] to-[var(--emerald-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Track Package</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Track shipments</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-[var(--emerald)] font-semibold">2 in transit</span>
            </div>
          </div>

          {/* Reviews & Ratings */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--trust-gold)]/30" onClick={() => router.push('/reviews')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--trust-gold)] to-[var(--saffron)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Reviews</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Customer feedback</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1">
                <Star className="w-3 h-3 text-[var(--trust-gold)] fill-current" />
                <span className="text-sm font-semibold">{userProfileData.reviews.average.toFixed(1)}</span>
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
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Security</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Change password</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--verified-green)] font-semibold">Secure</span>
            </div>
          </div>

          {/* Address Book */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--turquoise)]/30" onClick={() => router.push('/addresses')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--turquoise)] to-[var(--turquoise-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Addresses</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Manage addresses</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-[var(--muted)]">3 addresses</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="card-glass p-4 md:p-6 hover-lift cursor-pointer rounded-2xl transition-all duration-200 hover:border-[var(--saffron)]/30" onClick={() => router.push('/payment-methods')}>
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--saffron)] to-[var(--saffron-dark)] rounded-xl flex items-center justify-center mr-3 shadow-md">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Payments</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">Cards & wallets</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-[var(--muted)]">2 cards</span>
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
                <p className="text-xs md:text-sm text-[var(--muted)]">Choose language</p>
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
                <p className="text-xs md:text-sm text-[var(--muted)]">Appearance</p>
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

        {/* Account Actions - Enhanced */}
        <div className="card-glass p-4 md:p-6 text-center rounded-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)] text-sm md:text-base">Account Actions</h3>
              <p className="text-xs md:text-sm text-[var(--muted)]">Manage account</p>
            </div>
          </div>
          <button 
            onClick={async () => { await signOut(); router.push('/'); }} 
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white font-bold hover:scale-105 transition-all duration-200 mx-auto"
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
                  title={listeningField === 'name' ? 'Listening...' : 'Speak'}
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
                  title={listeningField === 'bio' ? 'Listening...' : 'Speak'}
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
                Change Password
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
                <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">Current Password</label>
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
                <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">New Password</label>
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
                <label className="block text-sm font-semibold text-[var(--text)] mb-1 md:mb-2">Confirm New Password</label>
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
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-indian-primary px-4 md:px-6 py-1.5 md:py-2 rounded-lg transition-all duration-200 hover:scale-105 text-sm md:text-base" 
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
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
                Share Profile
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
                <p className="text-sm text-[var(--muted)] mb-2">Profile Link:</p>
                <p className="text-sm text-[var(--text)] break-all">https://kalamitra.com/profile/{user?.id}</p>
              </div>
              
              <div className="flex gap-3">
                <button className="btn-indian-primary flex-1 py-2 rounded-lg">
                  Copy Link
                </button>
                <button className="btn-indian-secondary flex-1 py-2 rounded-lg">
                  Share on Social
    </button>
              </div>
            </div>
    </div>
  </div>
      )}
  </main>
  );
}