'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

type Auction = {
  id: string
  product_id: string
  seller_id: string
  starting_price: number
  starts_at?: string | null
  ends_at?: string | null
  status?: string
}

type Props = {
  productId: string
}

export default function AuctionWidget({ productId }: Props) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Array<{ id: string; bidder_id: string; amount: number; bidder?: { name?: string } }>>([])
  const [amount, setAmount] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    fetchAuction()
  }, [productId])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (auction?.ends_at) {
      const update = () => {
        const now = Date.now()
  const end = auction.ends_at ? new Date(auction.ends_at).getTime() : 0
        const diff = end - now
        if (diff <= 0) {
          setTimeLeft('00:00:00')
          // refresh auction to pick up status change and lock UI
          fetchAuction()
          if (timer) clearInterval(timer)
          return
        }
        const hrs = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`)
      }
      update()
      timer = setInterval(update, 1000)
    } else {
      setTimeLeft(null)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [auction?.ends_at])

  const fetchAuction = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('auctions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setAuction(data)
        fetchBids(data.id)
      } else {
        setAuction(null)
        setBids([])
      }
    } catch (err: unknown) {
      console.error('fetchAuction err', err)
    }
    setLoading(false)
  }

  const fetchBids = async (auctionId: string) => {
    try {
      const { data } = await supabase
        .from('bids')
        .select('*, bidder:profiles(name)')
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false })
      setBids(data || [])
    } catch (err: unknown) {
      console.error('fetchBids err', err)
    }
  }

  const placeBid = async () => {
    if (!user) return alert(t('auth.signInRequired'))
    if (!auction) return alert(t('auction.noAuction'))
    const numeric = Number(amount)
    if (!numeric || numeric <= 0) return alert(t('auction.invalidAmount'))

    // Refresh auction to ensure it's still running and not ended (prevent late bids)
    try {
      const { data: fresh } = await supabase.from('auctions').select('*').eq('id', auction.id).single()
      if (!fresh) return alert(t('auction.noAuction'))
      const endTs = fresh.ends_at ? new Date(fresh.ends_at).getTime() : 0
      if (fresh.status !== 'running' || (endTs && endTs <= Date.now())) {
        setAuction(fresh)
    return alert(t('auction.ended'))
      }
    } catch (err: unknown) {
      console.error('refresh auction failed', err)
    }

    // Ensure bid is higher than current highest or starting price
    const highest = bids[0]?.amount ?? auction.starting_price
    if (numeric <= highest) return alert(t('auction.bidTooLow'))

    try {
      const { error } = await supabase.from('bids').insert({
        auction_id: auction.id,
        bidder_id: user.id,
        amount: numeric
      })
      if (error) throw error
      setAmount('')
      fetchBids(auction.id)
    } catch (err: unknown) {
      console.error('placeBid err', err)
      alert(t('auction.bidFailed'))
    }
  }

  if (loading) return <div>{t('loading')}</div>

  if (!auction) return (
    <div className="p-4 card rounded-lg">
      <div className="text-sm text-[var(--muted)]">{t('auction.noAuction')}</div>
    </div>
  )

  const highest = bids[0]?.amount ?? auction.starting_price
  const auctionEnded = !!(auction && (auction.status !== 'running' || (auction.ends_at && new Date(auction.ends_at).getTime() <= Date.now())))

  return (
    <div className="p-4 card rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="text-sm text-[var(--muted)]">{t('auction.status')}: {auction.status}</div>
          <div className="text-lg font-semibold text-[var(--text)]">{t('auction.currentBid')}: ₹{highest}</div>
        </div>
        <div className="text-sm text-[var(--muted)]">{auction.starts_at ? new Date(auction.starts_at).toLocaleString() : ''} - {auction.ends_at ? new Date(auction.ends_at).toLocaleString() : ''}</div>
      </div>
      {timeLeft && (
        <div className="mb-3 text-sm text-red-500 font-mono">Time left: {timeLeft}</div>
      )}

      <div className="mb-3">
        <input
          type="number"
          value={amount === '' ? '' : String(amount)}
          onChange={(e) => {
            const v = e.target.value
            setAmount(v ? Number(v) : '')
          }}
          placeholder={t('auction.enterBid')}
          className="w-full border border-[var(--border)] p-2 rounded bg-[var(--bg-2)] text-[var(--text)]"
          disabled={auctionEnded}
        />
      </div>
      <div className="flex space-x-2">
        <button onClick={placeBid} disabled={auctionEnded} className={`px-4 py-2 ${auctionEnded ? 'bg-[var(--bg-2)] text-[var(--muted)] cursor-not-allowed' : 'bg-orange-500 text-white'} rounded`}>{auctionEnded ? t('auction.ended') : t('auction.placeBid')}</button>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-[var(--text)]">{t('auction.recentBids')}</h4>
        <ul className="mt-2">
      {bids.map(b => (
            <li key={b.id} className="flex justify-between py-1 border-b border-[var(--border)] text-[var(--muted)]">
              <span>{b.bidder?.name || b.bidder_id}</span>
              <span>₹{b.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
