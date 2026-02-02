"use client"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray } from '@/lib/translate'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Hammer, ExternalLink } from 'lucide-react'

type Bid = {
  amount: number
}

type AuctionRow = {
  id: string
  product_id: string
  status?: string
  starting_price: number
  starts_at?: string | null
  ends_at?: string | null
  product?: { title?: string; image_url?: string; price?: number }
  bids?: Bid[]
}

async function fetchAuctions() {
  const { data, error } = await supabase
    .from('auctions')
    .select('*, product:products(title, image_url, price), bids(amount)')
    .order('created_at', { ascending: false })
  if (error) throw error

  // Sort bids for each auction to find the highest
  const processed = data?.map(a => ({
    ...a,
    bids: a.bids?.sort((b1: Bid, b2: Bid) => b2.amount - b1.amount) || []
  })) || []

  return processed
}


export default function AuctionsPage() {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [auctions, setAuctions] = useState<AuctionRow[]>([])
  const [displayTitles, setDisplayTitles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchAuctions()
        setAuctions(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function translateTitles() {
      if (!auctions.length) {
        setDisplayTitles([])
        return
      }
      const titles = auctions.map(a => a.product?.title || 'Untitled')
      const trTitles = await translateArray(titles, currentLanguage)
      setDisplayTitles(trTitles)
    }
    translateTitles()
  }, [auctions, currentLanguage])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><div className="text-center"><div className="w-12 h-12 border-4 border-[var(--heritage-gold)] border-t-[var(--heritage-red)] rounded-full animate-spin mx-auto mb-4"></div><p className="text-[var(--muted)]">{t('common.loading')}</p></div></div>
  }

  return (
    <div className="min-h-screen heritage-bg">
      {/* Heritage Banner */}
      <div className="relative py-20 bg-[#3d0000] dark:bg-[var(--card)] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #b08d55 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="container-custom relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#b08d55] mb-4 drop-shadow-md">{t('auctions.title', 'Heritage Auctions')}</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto font-light">
            {t('auctions.subtitle', 'Bid on exclusive, handcrafted masterpieces directly from artisans. Own a piece of history.')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {auctions.map((a: AuctionRow, idx) => {
            const highestBid = a.bids && a.bids.length > 0 ? a.bids[0].amount : a.starting_price;
            const auctionTitle = displayTitles[idx] || a.product?.title || 'Untitled';

            return (
              <AuctionCard
                key={a.id}
                auction={a}
                title={auctionTitle}
                currentPrice={highestBid}
                t={t}
              />
            )
          })}
          {auctions.length === 0 && (
            <div className="col-span-full text-center py-20 text-[var(--muted)]">
              <Hammer className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl">{t('auctions.noActive', 'No active auctions at the moment. Check back soon!')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

function AuctionCard({ auction, title, currentPrice, t }: { auction: AuctionRow, title: string, currentPrice: number, t: TranslationFunction }) {
  // Use current time to trigger re-renders for status calculation
  // Initialize with null to prevent hydration mismatch (server time != client time)
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Set initial time on mount
    setNow(Date.now());

    // Sync with client clock every second
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Derived logic for status and timer label
  const start = auction.starts_at ? new Date(auction.starts_at).getTime() : 0;
  const end = auction.ends_at ? new Date(auction.ends_at).getTime() : null; // null means infinite

  let status = 'running';
  let timerDisplay = '';

  // 1. Check explicit DB status first (allow-list approach: if not 'running'/'upcoming', it's ended)
  const explicitStatus = auction.status?.toLowerCase().trim();
  const isExplicitlyActive = explicitStatus === 'running' || explicitStatus === 'upcoming' || explicitStatus === 'active';

  // 0. Loading/Hydration State
  if (now === null) {
    status = 'loading';
    timerDisplay = '...';
  }
  // 1. Explicitly Ended
  else if (explicitStatus && !isExplicitlyActive) {
    status = 'ended';
    timerDisplay = t('auctions.auctionEnded', 'Auction Ended');
  }
  // 2. Not started yet?
  else if (now < start) {
    status = 'upcoming';
    const diff = start - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const startsInLabel = t('auctions.startsIn', 'Starts in');
    timerDisplay = days > 0
      ? `${startsInLabel} ${days}d ${hrs}h`
      : `${startsInLabel} ${hrs}h ${mins}m`;
  }
  // 3. Past end time? (Only if end exists)
  else if (end !== null && now > end) {
    status = 'ended';
    timerDisplay = t('auctions.auctionEnded', 'Auction Ended');
  }
  // 4. Running
  else {
    status = 'running';
    if (end === null) {
      timerDisplay = t('auctions.ongoing', 'Ongoing');
    } else {
      const diff = end - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      timerDisplay = days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  const isActive = status === 'running';

  return (
    <div className="group relative bg-[#fdfbf7] dark:bg-[var(--card)] rounded-xl overflow-hidden border border-[#b08d55]/30 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      <div className="h-56 relative overflow-hidden bg-[var(--bg-2)]">
        {auction.product?.image_url ? (
          <Image
            src={auction.product.image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--muted)]">{t('auctions.noImage', 'No Image')}</div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm z-10 backdrop-blur-md bg-white/90">
          {status === 'running' ? (
            <span className="text-red-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> {t('auctions.live', 'LIVE')}</span>
          ) : status === 'upcoming' ? (
            <span className="text-blue-600">{t('auctions.upcoming', 'UPCOMING')}</span>
          ) : status === 'loading' ? (
            <span className="text-gray-400">...</span>
          ) : (
            <span className="text-gray-500">{t('auctions.endedStatus', 'ENDED')}</span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-serif font-bold text-xl text-[var(--heritage-brown)] dark:text-[var(--heritage-gold)] mb-2 line-clamp-1" title={title}>
          {title}
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('auctions.currentBidLabel', 'Current Bid')}</p>
            <p className="text-2xl font-bold text-[var(--heritage-red)] dark:text-white">₹{currentPrice.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('auctions.timeLeft', 'Time Left')}</p>
            <div className={`text-lg font-mono font-medium flex items-center justify-end gap-1 ${isActive ? 'text-[var(--heritage-brown)] dark:text-[var(--heritage-gold)]' : 'text-gray-400'}`}>
              <Clock className="w-4 h-4" />
              {timerDisplay}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <Link
            href={`/product/${auction.product_id}`}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors ${isActive
              ? 'bg-[#3d0000] hover:bg-[#590000] text-[#b08d55] dark:bg-[var(--heritage-gold)] dark:text-[#3d0000] dark:hover:bg-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800'
              }`}
          >
            {isActive ? (
              <> {t('auctions.placeBid', 'Place Bid')} <Hammer className="w-4 h-4" /></>
            ) : (
              <> {t('auctions.viewDetails', 'View Details')} <ExternalLink className="w-4 h-4" /></>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
