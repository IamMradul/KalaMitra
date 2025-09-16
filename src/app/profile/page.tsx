'use client'
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../components/LanguageProvider';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';

export default function ProfilePage() {
  // Full language list (should match Navbar)
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
  const { user, profile, loading, signOut } = useAuth();
  const [form, setForm] = useState({ name: '', bio: '', profile_image: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { currentLanguage, changeLanguage, isLoading: languageLoading } = useLanguage();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        profile_image: profile.profile_image || '',
      });
    }
  }, [profile]);

  if (loading) return <div className="container-custom py-10">Loading...</div>;
  if (!user) return <div className="container-custom py-10">Please sign in to view your profile.</div>;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    if (edit && fileInputRef.current) fileInputRef.current.click();
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
    <main className="container-custom py-10 max-w-2xl mx-auto">
      <div className="w-full max-w-2xl mx-auto rounded-3xl shadow-xl border border-neutral-200 dark:border-yellow-400/10 bg-white dark:bg-[#18181b]/90 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-neutral-100 dark:border-yellow-900 bg-white/95 dark:bg-[#18181b]/95">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-yellow-100 mb-1 tracking-tight">Profile & Settings</h1>
          <p className="text-base text-neutral-500 dark:text-yellow-200">Manage your account, preferences, and appearance</p>
        </div>
        <div className="px-8 py-8 flex flex-col gap-10">
        {/* Profile Section */}
  {/* Profile Section */}
  <section className="flex flex-col sm:flex-row items-center gap-8 border-b border-neutral-100 dark:border-yellow-900 pb-10">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Click to change profile image">
            {form.profile_image ? (
              <img src={form.profile_image + (form.profile_image.includes('?cb=') ? '' : `?cb=${Date.now()}`)} alt="avatar" className="w-28 h-28 rounded-full object-cover border-4 border-blue-400 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-hover:ring-pink-300/40" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-200 via-pink-200 to-blue-200 dark:from-yellow-900 dark:via-pink-900 dark:to-blue-900 flex items-center justify-center text-5xl font-bold border-4 border-blue-400 shadow-2xl group-hover:scale-110 group-hover:ring-4 group-hover:ring-pink-300/40 transition-all duration-300">{form.name?.[0]}</div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <span className="absolute bottom-2 right-2 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-xs rounded-full px-2 py-0.5 opacity-90 group-hover:opacity-100 shadow-lg font-semibold animate-pulse">Edit</span>
          </div>
          <div className="flex-1 flex flex-col gap-1 items-center sm:items-start">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-yellow-100">{form.name}</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-yellow-300 mb-1">{profile?.role}</div>
            <div className="text-base sm:text-lg mt-1 text-neutral-700 dark:text-neutral-200 text-center sm:text-left">{form.bio || <span className="text-neutral-400 dark:text-neutral-500">No bio</span>}</div>
            <button className="btn-primary px-5 py-2 mt-4 shadow bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:ring-4 focus:ring-yellow-200/50 dark:focus:ring-pink-200/50" onClick={() => setEdit(true)}>
              Edit Profile
            </button>
          </div>
        </section>
        {/* Edit Profile Modal */}
        {edit && (
          <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-[#23233b] p-8 rounded-2xl shadow-2xl border border-neutral-200 dark:border-yellow-900 animate-fade-in">
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-semibold text-neutral-800 dark:text-yellow-100">Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full border-2 border-neutral-200 dark:border-pink-900 rounded-lg p-3 bg-white dark:bg-[#22223b] text-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-yellow-200 dark:focus:ring-pink-300 transition-all duration-200" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-semibold text-neutral-800 dark:text-yellow-100">Bio</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} className="w-full border-2 border-neutral-200 dark:border-pink-900 rounded-lg p-3 bg-white dark:bg-[#22223b] text-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-yellow-200 dark:focus:ring-pink-300 transition-all duration-200" rows={3} />
            </div>
            <div className="flex gap-4 justify-end">
              <button type="submit" className="btn-primary px-8 py-2 shadow bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:ring-4 focus:ring-yellow-200/50 dark:focus:ring-pink-200/50" disabled={saving || uploading}>
                {saving || uploading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="ml-4 text-neutral-500 dark:text-gray-300 hover:text-red-500 font-semibold transition-all duration-200 hover:scale-105" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </form>
        )}
        {/* Preferences Section */}
        <section className="flex flex-col gap-8 border-b border-neutral-100 dark:border-yellow-900 pb-8">
          <div>
            <div className="font-semibold mb-2 text-base text-neutral-800 dark:text-yellow-100">Language</div>
            <select
              className="w-full max-w-xs px-4 py-3 rounded-lg border border-neutral-200 dark:border-pink-900 bg-white dark:bg-[#23233b] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-200 dark:focus:ring-pink-300 shadow transition-all duration-200"
              value={currentLanguage}
              onChange={e => changeLanguage(e.target.value)}
              disabled={languageLoading}
              aria-label="Select language"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="font-semibold mb-2 text-base text-neutral-800 dark:text-yellow-100">Theme</div>
            <div className="flex items-center gap-4">
              <button onClick={toggle} className="p-3 rounded-full border border-neutral-200 dark:border-pink-900 bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-100 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl focus:ring-4 focus:ring-yellow-200 dark:focus:ring-pink-200/50">
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
              <span className="text-neutral-700 dark:text-yellow-100 text-base font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </div>
        </section>
        {/* Account Actions Section */}
        <section className="flex flex-col gap-4 pt-8">
      <button onClick={async () => { await signOut(); router.push('/'); }} className="flex items-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-red-200 via-pink-200 to-yellow-100 dark:from-red-900 dark:via-pink-900 dark:to-yellow-900 text-red-700 dark:text-yellow-100 font-bold hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:ring-4 focus:ring-yellow-200 dark:focus:ring-pink-200/50 text-base shadow-md">
    <LogOut className="w-6 h-6" /> Sign Out
    </button>
    </section>
    </div>
  </div>
  </main>
  );
}
