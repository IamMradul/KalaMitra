'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import {
  User, Edit3, Camera, MapPin, Package, Heart, Settings,
  LogOut, ShoppingBag, Truck, CreditCard, Bell, Shield,
  ChevronRight, Calendar, Mail, Phone, Home, Plus, Trash2,
  CheckCircle, AlertCircle, Search, Filter, X, LayoutDashboard, MessageCircle, Menu
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// --- Types ---
type Tab = 'overview' | 'orders' | 'wishlist' | 'addresses' | 'settings' | 'notifications' | 'messages'

type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface Order {
  id: string
  date: string
  total: number
  status: OrderStatus
  items: { name: string; image: string; quantity: number }[]
}

interface OrderItem {
  product?: {
    title: string
    image_url: string
  }
  quantity: number
}

interface OrderFromDB {
  id: string
  order_reference?: string
  created_at: string
  total_amount: number
  status: OrderStatus
  items: OrderItem[]
}

// --- Types ---
interface Address {
  id: string
  profile_id: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  type: 'Home' | 'Work' | 'Other'
  is_default: boolean
}

// --- Mock Data ---


// Removed mock addresses

import NotificationsList from '@/components/NotificationsList'

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Profile Form State
  const [form, setForm] = useState({ name: '', bio: '', profile_image: '' })
  const [uploading, setUploading] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Data State
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [fetchingAddresses, setFetchingAddresses] = useState(false)
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    name: '', street: '', city: '', state: '', zip: '', phone: '', type: 'Home', is_default: false
  })
  const [wishlistCount, setWishlistCount] = useState(0) // Mock count

  // Initial Data Load
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    if (profile) {
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        profile_image: profile.profile_image || ''
      })
      fetchAddresses()
      fetchOrders()
      setWishlistCount(profile.wishlist?.length || 0)
    }
  }, [user, profile, loading, router])

  // Added notification count state
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchUnreadNotifs()
    }
  }, [profile])

  const fetchUnreadNotifs = async () => {
    if (!user) return;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
    setUnreadNotifCount(count || 0);
  }

  const fetchOrders = async () => {
    if (!user) return

    // Using the real schema: buyer_id, total_amount, etc.
    const { data: fullOrders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
           quantity,
           product:products(title, image_url)
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return
    }

    if (fullOrders) {
      const formattedOrders: Order[] = fullOrders.map((o: OrderFromDB) => ({
        id: o.order_reference || o.id, // Use order_reference if available
        date: new Date(o.created_at).toISOString().split('T')[0],
        total: o.total_amount,
        status: o.status as OrderStatus,
        items: (o.items || []).map((i: OrderItem) => ({
          name: i.product?.title || 'Unknown Product',
          image: i.product?.image_url || '',
          quantity: i.quantity
        }))
      }))
      setOrders(formattedOrders)
    }
  }
  const fetchAddresses = async () => {
    if (!profile) return
    setFetchingAddresses(true)
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profile.id)
      .order('is_default', { ascending: false })

    if (error) {
      console.error('Error fetching addresses:', JSON.stringify(error, null, 2))
      // Alert only in dev for visibility, or show a toast
      if (process.env.NODE_ENV === 'development') {
        console.log('Ensure you have created the "addresses" table within your Supabase project.')
      }
    } else {
      setAddresses(data || [])
    }
    setFetchingAddresses(false)
  }

  const handleAddAddress = async () => {
    if (!profile) return
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.zip || !newAddress.phone) {
      alert(t('profile.fillAllFields'))
      return
    }

    try {
      // If setting as default, unset others first (optional, simplistic approach)
      if (newAddress.is_default && addresses.length > 0) {
        // ideally handled by trigger or transaction, but simple update loop for now
        // or just let frontend handle display priority
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          profile_id: profile.id,
          name: newAddress.name!,
          street: newAddress.street!,
          city: newAddress.city!,
          state: newAddress.state!,
          zip: newAddress.zip!,
          phone: newAddress.phone!,
          type: newAddress.type as 'Home' | 'Work' | 'Other',
          is_default: newAddress.is_default
        })
        .select()
        .single()

      if (error) throw error

      setAddresses([data, ...addresses])
      setShowAddAddressModal(false)
      setNewAddress({ name: '', street: '', city: '', state: '', zip: '', phone: '', type: 'Home', is_default: false })
      alert(t('profile.addressAdded'))
    } catch (error) {
      console.error('Error adding address:', error)
      alert(t('profile.errorAddingAddress'))
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(t('profile.confirmDeleteAddress'))) return
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAddresses(addresses.filter(a => a.id !== id))
    } catch (error) {
      console.error('Error deleting address:', error)
      alert(t('profile.errorDeletingAddress'))
    }
  }

  // --- Handlers ---

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const fileName = `profile-images/${user.id}-${Date.now()}.jpg`

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Update DB
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ profile_image: publicUrl })
        .eq('id', user.id)

      if (dbError) throw dbError

      // Update Local State
      setForm(prev => ({ ...prev, profile_image: publicUrl }))

    } catch (error) {
      console.error('Error uploading image:', error)
      alert(t('profile.errorUploadingImage'))
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: form.name,
          bio: form.bio
        })
        .eq('id', user.id)

      if (error) throw error
      setEditMode(false)
      alert(t('profile.profileUpdated'))
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(t('profile.errorUpdatingProfile'))
    }
  }

  // --- Render Components ---

  const SidebarItem = ({ id, icon: Icon, label, badge }: { id: Tab, icon: React.ComponentType<{className?: string}>, label: string, badge?: number }) => (
    <button
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false) }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id
        ? 'bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white shadow-lg'
        : 'text-[var(--text)] hover:bg-[var(--bg-2)]'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
      ) : null}
      {activeTab === id && !badge && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  )

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const styles = {
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      shipped: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
        {status}
      </span>
    )
  }

  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-1)]">
      <div className="animate-spin w-12 h-12 border-4 border-[var(--heritage-gold)] border-t-transparent rounded-full"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-1)] font-sans text-[var(--text)]">
      {/* Background Decor */}
      <div className="fixed inset-0 indian-pattern opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Mobile Sidebar Overlay Backdrop */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* --- Sidebar Navigation --- */}
          <aside className={`
            lg:w-1/4 lg:block lg:relative
            fixed top-0 left-0 h-full z-50 lg:z-auto w-80 max-w-[85vw]
            transition-transform duration-300 lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="card-glass rounded-2xl p-6 lg:sticky lg:top-24 border border-[var(--border)] h-full lg:h-auto overflow-y-auto">
              {/* Close button for mobile */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden absolute top-4 right-4 p-2 hover:bg-[var(--bg-2)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Mini Profile */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-1)] relative">
                      {form.profile_image ? (
                        <img src={form.profile_image} alt={form.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-2)]">
                          <User className="w-8 h-8 text-[var(--muted)]" />
                        </div>
                      )}
                      {/* Hover Edit Overlay */}
                      <button
                        onClick={handleAvatarClick}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
                <h2 className="text-xl font-bold text-center">{form.name || 'User'}</h2>
                <p className="text-sm text-[var(--muted)]">{profile.email}</p>
                <div className="mt-2 text-xs px-2 py-1 bg-[var(--heritage-gold)]/10 text-[var(--heritage-gold)] rounded-full border border-[var(--heritage-gold)]/20">
                  {profile.role === 'seller' ? 'Seller Account' : 'Buyer Account'}
                </div>

                {profile.role === 'seller' && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsSidebarOpen(false)}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--text)] text-[var(--bg-1)] rounded-xl font-bold text-sm hover:bg-[var(--heritage-gold)] hover:text-white transition-all shadow-md"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Seller Dashboard
                  </Link>
                )}
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <SidebarItem id="overview" icon={Home} label={t('profile.overview', { defaultValue: 'Overview' })} />
                <SidebarItem id="orders" icon={Package} label={t('profile.myOrders', { defaultValue: 'Orders' })} />
                <SidebarItem id="wishlist" icon={Heart} label={t('profile.wishlist', { defaultValue: 'Wishlist' })} />
                <SidebarItem id="notifications" icon={Bell} label="Notifications" badge={unreadNotifCount} />
                <SidebarItem id="messages" icon={MessageCircle} label={t('navbar.messages', { defaultValue: 'Messages' })} />
                <SidebarItem id="addresses" icon={MapPin} label={t('profile.addresses', { defaultValue: 'Addresses' })} />
                <SidebarItem id="settings" icon={Settings} label={t('profile.settings', { defaultValue: 'Settings' })} />
              </nav>

              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('auth.signOut', { defaultValue: 'Sign Out' })}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* --- Main Content --- */}
          <main className="flex-1 min-w-0">
            {/* Mobile Menu Toggle Button */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-full flex items-center justify-between px-6 py-4 card-glass rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-2)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {form.profile_image ? (
                    <img src={form.profile_image} alt={form.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--muted)]" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-[var(--text)]">{form.name || 'User'}</p>
                    <p className="text-xs text-[var(--muted)]">View Profile Menu</p>
                  </div>
                </div>
                <Menu className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl">
                <h2 className="text-2xl font-bold heritage-title mb-6">Notifications</h2>
                <div className="card-glass rounded-2xl p-6 border border-[var(--border)] min-h-[400px]">
                  <NotificationsList />
                </div>
              </motion.div>
            )}
            {activeTab === 'messages' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl">
                <h2 className="text-2xl font-bold heritage-title mb-6">{t('navbar.messages', { defaultValue: 'Messages' })}</h2>
                <Link href="/dm" className="card-glass rounded-2xl p-6 border border-[var(--border)] min-h-[400px] flex items-center justify-center hover:bg-[var(--bg-2)] transition-colors">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-[var(--heritage-gold)] mx-auto mb-4" />
                    <p className="text-lg font-semibold text-[var(--text)] mb-2">{t('navbar.messages', { defaultValue: 'Messages' })}</p>
                    <p className="text-sm text-[var(--muted)]">Click here to view and send messages</p>
                  </div>
                </Link>
              </motion.div>
            )}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Welcome Banner */}
                <div className="card-glass rounded-2xl p-8 border border-[var(--border)] relative overflow-hidden">
                  <div className="relative z-10">
                    <h1 className="text-3xl font-bold heritage-title mb-2">
                      {t('profile.welcomeBack', { defaultValue: 'Namaste' })}, {form.name.split(' ')[0]}!
                    </h1>
                    <p className="text-[var(--muted)] max-w-lg">
                      {t('profile.welcomeDesc', { defaultValue: 'Explore the finest Indian artistry tailored just for you.' })}
                    </p>
                  </div>
                  {/* Decorative Blob */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--saffron)]/10 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card-glass p-5 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center text-center">
                    <ShoppingBag className="w-8 h-8 text-[var(--heritage-gold)] mb-2" />
                    <span className="text-2xl font-bold">{orders.length}</span>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Orders</span>
                  </div>
                  <div className="card-glass p-5 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center text-center">
                    <Heart className="w-8 h-8 text-[var(--heritage-red)] mb-2" />
                    <span className="text-2xl font-bold">{wishlistCount}</span>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Wishlist</span>
                  </div>
                  <div className="card-glass p-5 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center text-center">
                    <Truck className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-2xl font-bold">1</span>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-wide">In Transit</span>
                  </div>
                  <div className="card-glass p-5 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center text-center">
                    <CreditCard className="w-8 h-8 text-green-500 mb-2" />
                    <span className="text-2xl font-bold">₹0</span>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Credits</span>
                  </div>
                </div>

                {/* Recent Orders Preview */}
                <div className="card-glass rounded-2xl p-6 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-[var(--heritage-gold)]" />
                      Recent Orders
                    </h3>
                    <button onClick={() => setActiveTab('orders')} className="text-sm text-[var(--heritage-red)] font-semibold hover:underline">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {orders.slice(0, 2).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-[var(--bg-2)]/50 rounded-xl border border-[var(--border)]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[var(--bg-3)] rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-[var(--muted)]" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{order.items[0].name} {order.items.length > 1 && `+${order.items.length - 1} more`}</p>
                            <p className="text-xs text-[var(--muted)]">Ordered on {order.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{order.total}</p>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold heritage-title">My Orders</h2>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-[var(--bg-2)] border border-[var(--border)]"><Search className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg bg-[var(--bg-2)] border border-[var(--border)]"><Filter className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="card-glass rounded-2xl border border-[var(--border)] overflow-hidden">
                      <div className="p-4 bg-[var(--bg-2)]/30 border-b border-[var(--border)] flex flex-wrap gap-4 justify-between items-center">
                        <div>
                          <p className="text-xs text-[var(--muted)] uppercase font-bold">Order Placed</p>
                          <p className="text-sm font-medium">{order.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)] uppercase font-bold">Total</p>
                          <p className="text-sm font-medium">₹{order.total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)] uppercase font-bold">Order ID</p>
                          <p className="text-sm font-mono">{order.id}</p>
                        </div>
                        <div className="ml-auto">
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                      <div className="p-6">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 mb-4 last:mb-0">
                            <div className="w-16 h-16 bg-[var(--bg-3)] rounded-lg flex-shrink-0 flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} className="w-full h-full object-cover rounded-lg" />
                              ) : <Package className="w-8 h-8 text-[var(--muted)]" />}
                            </div>
                            <div>
                              <h4 className="font-bold">{item.name}</h4>
                              <p className="text-sm text-[var(--muted)]">Qty: {item.quantity}</p>
                            </div>
                            <button className="ml-auto text-sm text-[var(--heritage-gold)] font-semibold hover:underline">
                              Write a Review
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'wishlist' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {wishlistCount > 0 ? (
                  <div className="text-center py-20 card-glass rounded-2xl border border-[var(--border)]">
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-red-500 fill-current" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('wishlist.itemsSaved', { count: wishlistCount, defaultValue: `You have ${wishlistCount} items saved` })}</h2>
                    <p className="text-[var(--muted)] mb-6">{t('wishlist.viewAllDesc', { defaultValue: 'View your saved treasures in your dedicated wishlist.' })}</p>
                    <Link href="/wishlist" className="px-8 py-3 bg-[var(--heritage-gold)] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[var(--heritage-red)] transition-all">
                      {t('wishlist.goToWishlist', { defaultValue: 'View My Wishlist' })}
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-20 card-glass rounded-2xl border border-[var(--border)]">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-[var(--muted)]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('wishlist.emptyTitle', { defaultValue: 'Your Wishlist is Empty' })}</h2>
                    <p className="text-[var(--muted)] mb-6">{t('wishlist.emptyDescription', { defaultValue: 'Save items you love to revisit them later.' })}</p>
                    <Link href="/marketplace" className="px-6 py-3 bg-[var(--heritage-gold)] text-white rounded-xl font-bold hover:bg-[var(--heritage-red)] transition-colors">
                      {t('marketplace.browse', { defaultValue: 'Browse Marketplace' })}
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'addresses' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold heritage-title">Saved Addresses</h2>
                  <button
                    onClick={() => setShowAddAddressModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--heritage-gold)] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[var(--heritage-red)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>

                {fetchingAddresses ? (
                  <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-[var(--heritage-gold)] border-t-transparent rounded-full mx-auto"></div></div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-12 card-glass rounded-2xl border border-[var(--border)]">
                    <MapPin className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                    <p className="text-[var(--muted)]">No addresses saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`card-glass p-6 rounded-2xl border ${addr.is_default ? 'border-[var(--heritage-gold)] ring-1 ring-[var(--heritage-gold)]/20' : 'border-[var(--border)]'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-[var(--bg-3)] rounded text-xs font-bold uppercase">{addr.type}</span>
                            {addr.is_default && <span className="text-xs text-[var(--heritage-gold)] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Default</span>}
                          </div>
                          <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-[var(--bg-2)] rounded transition-colors" title="Edit"><Edit3 className="w-4 h-4 text-[var(--muted)]" /></button>
                            <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </div>
                        <h4 className="font-bold text-lg mb-1">{addr.name}</h4>
                        <p className="text-[var(--muted)] text-sm mb-4 leading-relaxed">
                          {addr.street}<br />
                          {addr.city}, {addr.state} {addr.zip}<br />
                          Phone: {addr.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Add Address Modal */}
            <AnimatePresence>
              {showAddAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--bg-2)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
                  >
                    <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                      <h3 className="text-xl font-bold heritage-title">Add New Address</h3>
                      <button onClick={() => setShowAddAddressModal(false)} className="p-1 hover:bg-[var(--bg-3)] rounded-full transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Full Name</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.name}
                            onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Street Address</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.street}
                            onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                            placeholder="123 Main St, Apt 4B"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">City</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.city}
                            onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">State</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.state}
                            onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                            placeholder="NY"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">ZIP Code</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.zip}
                            onChange={e => setNewAddress({ ...newAddress, zip: e.target.value })}
                            placeholder="10001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Phone</label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                            value={newAddress.phone}
                            onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                            placeholder="+1 234 567 890"
                          />
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Type</label>
                            <select
                              className="w-full p-2.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent outline-none"
                              value={newAddress.type}
                              onChange={e => setNewAddress({ ...newAddress, type: e.target.value as 'Home' | 'Work' | 'Other' })}
                            >
                              <option value="Home">Home</option>
                              <option value="Work">Work</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer mt-5">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-[var(--heritage-gold)] rounded focus:ring-[var(--heritage-gold)]"
                                checked={newAddress.is_default}
                                onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                              />
                              <span className="font-medium">Set as Default</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--bg-1)]/50">
                      <button
                        onClick={() => setShowAddAddressModal(false)}
                        className="px-4 py-2 rounded-xl font-medium hover:bg-[var(--bg-3)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAddress}
                        className="px-6 py-2 bg-[var(--heritage-gold)] text-white rounded-xl font-bold hover:bg-[var(--heritage-red)] transition-colors shadow-lg"
                      >
                        Save Address
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl">
                <h2 className="text-2xl font-bold heritage-title mb-6">Account Settings</h2>

                {/* Basic Info */}
                <div className="card-glass p-6 rounded-2xl border border-[var(--border)] mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Personal Information</h3>
                    <button
                      onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
                      className={`text-sm font-bold ${editMode ? 'text-green-600' : 'text-[var(--heritage-gold)]'}`}
                    >
                      {editMode ? 'Save Changes' : 'Edit'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Full Name</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full p-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg focus:border-[var(--heritage-gold)] outline-none"
                        />
                      ) : (
                        <p className="font-medium">{form.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Email</label>
                      <p className="font-medium opacity-70">{profile.email} <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span></p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-1">Bio</label>
                      {editMode ? (
                        <textarea
                          value={form.bio}
                          onChange={e => setForm({ ...form, bio: e.target.value })}
                          className="w-full p-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg focus:border-[var(--heritage-gold)] outline-none h-24"
                        />
                      ) : (
                        <p className="font-medium">{form.bio || 'No bio provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notifications (Mock) */}
                <div className="card-glass p-6 rounded-2xl border border-[var(--border)] mb-6">
                  <h3 className="font-bold text-lg mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Order Updates</span>
                      <div className="w-10 h-6 bg-[var(--heritage-gold)] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Promotions</span>
                      <div className="w-10 h-6 bg-[var(--border)] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div></div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="card-glass p-6 rounded-2xl border border-red-200 dark:border-red-900/30">
                  <h3 className="font-bold text-red-500 mb-4">Danger Zone</h3>
                  <button className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    Delete Account
                  </button>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}