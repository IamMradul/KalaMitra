'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

type AuctionRow = Database['public']['Tables']['auctions']['Row'] & { product_title?: string }

export default function SellerAuctionsList({ sellerId }: { sellerId: string }) {
  const { t } = useTranslation()
  const [auctions, setAuctions] = useState<AuctionRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('auctions').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
      const rows = (data || []) as Database['public']['Tables']['auctions']['Row'][]
      // fetch product titles for these auctions
      const productIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean)))
  const productMap: Record<string, string> = {}
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('id,title').in('id', productIds)
        for (const p of (products || []) as { id: string; title: string }[]) productMap[p.id] = p.title
      }
      const withTitles: AuctionRow[] = rows.map((r) => ({ ...r, product_title: productMap[r.product_id] || r.product_id }))
      setAuctions(withTitles)
    } catch (err: unknown) {
      console.error('fetch seller auctions err', err)
    }
    setLoading(false)
  }, [sellerId])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  const endAuction = async (id: string) => {
    if (!confirm(t('common.confirm')) ) return
    try {
      const res = await fetch('/api/auction/end', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ auction_id: id }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'failed')
      if (j.winner) {
        alert(t('auction.endedWithWinner', { name: j.winner.bidder_id, amount: j.winner.amount }))
      } else {
        alert(t('auction.endedNoBids'))
      }
      fetchAuctions()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert(t('errors.general') + ': ' + message)
    }
  }

  const deleteAuction = async (id: string) => {
    if (!confirm(t('common.confirm'))) return
    try {
      // For now perform a direct DB delete via supabase client (seller must have permission)
      const { error } = await supabase.from('auctions').delete().eq('id', id)
      if (error) throw error
      alert(t('auction.deleted'))
      fetchAuctions()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert(t('errors.general') + ': ' + message)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3 text-[var(--muted)]">
        <div className="w-6 h-6 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        <span className="text-sm sm:text-base">{t('common.loading')}</span>
      </div>
    </div>
  )
  
  if (auctions.length === 0) return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📦</div>
      <p className="text-base sm:text-lg font-semibold text-[var(--text)] mb-2">No Active Auctions</p>
      <p className="text-sm text-[var(--muted)]">{t('seller.noProducts')}</p>
    </div>
  )

  return (
    <div>
      <div className="grid gap-4 sm:gap-6">
        {auctions.map(a => (
          <div 
            key={a.id} 
            className="relative overflow-hidden rounded-xl bg-[var(--bg-2)] dark:bg-[var(--bg-2)] border-2 border-amber-300 dark:border-amber-700/50 shadow-md hover:shadow-xl transition-all duration-300 group"
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-lg ${
                a.status === 'running' 
                  ? 'bg-green-500 text-white' 
                  : a.status === 'scheduled'
                  ? 'bg-blue-500 text-white'
                  : a.status === 'cancelled'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}>
                {a.status === 'running' ? '🟢 Active' : a.status === 'scheduled' ? '🔵 Scheduled' : a.status === 'cancelled' ? '🔴 Cancelled' : '⚫ Completed'}
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-[var(--text)] mb-3 pr-24 line-clamp-2 group-hover:text-amber-600 transition-colors">
                    {a.product_title || a.product_id}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">💰</span>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-[var(--muted)] font-medium">Starting Price</p>
                        <p className="text-base font-bold text-amber-600 dark:text-amber-400">₹{a.starting_price || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {a.starts_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">🕐</span>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-[var(--muted)] font-medium">Starts</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-[var(--text)]">{new Date(a.starts_at).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-600 dark:text-[var(--muted)]">{new Date(a.starts_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {a.ends_at && (
                      <div className="flex items-center gap-2 text-sm sm:col-span-2">
                        <span className="text-lg">⏰</span>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-[var(--muted)] font-medium">Ends</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-[var(--text)]">{new Date(a.ends_at).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-600 dark:text-[var(--muted)]">{new Date(a.ends_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col xs:flex-row lg:flex-col gap-2 lg:w-48">
                  {a.status !== 'completed' && (
                    <button 
                      onClick={() => endAuction(a.id)} 
                      className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      <span>🏁</span>
                      <span>End Auction</span>
                    </button>
                  )}
                  <button 
                    onClick={() => deleteAuction(a.id)} 
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                  >
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
