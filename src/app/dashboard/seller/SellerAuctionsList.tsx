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

  if (loading) return <div>{t('common.loading')}</div>
  if (auctions.length === 0) return <div>{t('seller.noProducts')}</div>

  return (
    <div>
      <div className="grid gap-3">
        {auctions.map(a => (
          <div key={a.id} className="card border p-3 rounded flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[var(--text)]">{a.product_title || a.product_id}</div>
              <div className="text-sm text-[var(--muted)]">{t('auction.status')}: {a.status} | {t('auction.title')}: {a.starts_at ? new Date(a.starts_at).toLocaleString() : ''}  {a.ends_at ? new Date(a.ends_at).toLocaleString() : ''}</div>
            </div>
            <div className="mt-3 md:mt-0 flex space-x-2">
              {a.status !== 'completed' && <button onClick={() => endAuction(a.id)} className="px-3 py-1 bg-blue-600 text-white rounded">{t('common.confirm')}</button>}
              <button onClick={() => deleteAuction(a.id)} className="px-3 py-1 bg-red-600 text-white rounded">{t('auction.deleted')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
