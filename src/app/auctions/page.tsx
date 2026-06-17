"use client"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray } from '@/lib/translate'
import { useAuth } from '@/contexts/AuthContext'
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
  // Auth state from context
  const { user } = useAuth()
  // Modal submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)
  
  // Modal state
  const [selectedAuction, setSelectedAuction] = useState<AuctionRow | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');

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
    
    // Removed manual auth fetch as we use AuthContext now
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

  useEffect(() => {
    const channel = supabase.channel('public:bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, payload => {
        const newBid = payload.new as { auction_id: string; amount: number };
        setAuctions(prev => prev.map(a => {
          if (a.id === newBid.auction_id) {
            const updatedBids = [...(a.bids ?? []), { amount: newBid.amount }];
            updatedBids.sort((b1, b2) => b2.amount - b1.amount);
            return { ...a, bids: updatedBids };
          }
          return a;
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><div className="text-center"><div className="w-12 h-12 border-4 border-[var(--heritage-gold)] border-t-[var(--heritage-red)] rounded-full animate-spin mx-auto mb-4"></div><p className="text-[var(--muted)]">{t('common.loading')}</p></div></div>
  }
  
  // Derive live and ended auctions based on current time
  const liveAuctions = auctions.filter(a => getAuctionStatus(a, Date.now()).status === 'running');
  const endedAuctions = auctions.filter(a => getAuctionStatus(a, Date.now()).status === 'ended');
  return (
    <div className="min-h-screen heritage-bg">
      {/* Heritage Banner */}
      <div className="relative py-10 bg-[#3d0000] dark:bg-[var(--card)] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #b08d55 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="container-custom relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#b08d55] mb-4 drop-shadow-md">{t('auctions.title', 'Heritage Auctions')}</h1>
          <p className="text-lg text-[var(--text)] text-opacity-80 max-w-2xl mx-auto font-light">
            {t('auctions.subtitle', 'Bid on exclusive, handcrafted masterpieces directly from artisans. Own a piece of history.')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Live Auctions Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-[var(--heritage-gold)] flex items-center gap-2">
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-sm">LIVE</span>
            {t('auctions.liveSection', 'Live Auctions')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {liveAuctions.map((a: AuctionRow, idx) => {
              const highestBid = a.bids && a.bids.length > 0 ? a.bids[0].amount : a.starting_price;
              const auctionTitle = displayTitles[auctions.indexOf(a)] || a.product?.title || 'Untitled';
              return (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  title={auctionTitle}
                  currentPrice={highestBid}
                  t={t}
                  onSelectAuction={setSelectedAuction}
                  isAuthenticated={!!user}
                />
              );
            })}
            {liveAuctions.length === 0 && (
              <div className="col-span-full text-center py-20 text-[var(--muted)]">
                <Hammer className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl">{t('auctions.noLive', 'No live auctions currently.')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Ended Auctions Section */}
        <section>
          <h2 className="text-3xl font-bold mb-6 text-[var(--muted)] flex items-center gap-2">
            <span className="bg-gray-400 text-white px-2 py-1 rounded-full text-sm">ENDED</span>
            {t('auctions.endedSection', 'Ended Auctions')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-70">
            {endedAuctions.map((a: AuctionRow, idx) => {
              const highestBid = a.bids && a.bids.length > 0 ? a.bids[0].amount : a.starting_price;
              const auctionTitle = displayTitles[auctions.indexOf(a)] || a.product?.title || 'Untitled';
              return (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  title={auctionTitle}
                  currentPrice={highestBid}
                  t={t}
                  onSelectAuction={setSelectedAuction}
                  isAuthenticated={!!user}
                />
              );
            })}
            {endedAuctions.length === 0 && (
              <div className="col-span-full text-center py-20 text-[var(--muted)]">
                <Hammer className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl">{t('auctions.noEnded', 'No ended auctions yet.')}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bid Modal */}
      {selectedAuction && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-[var(--card)] rounded-xl shadow-lg p-6 w-full max-w-md backdrop-blur-lg border border-white/20">
            <h2 className="text-2xl font-bold mb-4">{t('auctions.placeBid', 'Place Bid')}</h2>
            <p className="mb-2">
              {t('auctions.currentBidLabel', 'Current Bid')}: ₹{selectedAuction.bids && selectedAuction.bids.length > 0 ? selectedAuction.bids[0].amount.toLocaleString() : selectedAuction.starting_price.toLocaleString()}
            </p>
            <input
              type="number"
              placeholder={t('auctions.enterBid', 'Enter your bid')}
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />
            {bidError && <p className="text-red-500 mb-2">{bidError}</p>}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setSelectedAuction(null); setBidAmount(''); setBidError(null); }}
                className="px-4 py-2 bg-gray-200 dark:bg-[var(--muted)] rounded"
              >{t('common.cancel', 'Cancel')}</button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedAuction) return;
                  setIsSubmitting(true);
                  setBidError(null);
                  try {
                    if (!user) { setBidError('Please log in to bid'); return; }
                    const amountNum = Number(bidAmount);
                    if (isNaN(amountNum) || amountNum <= 0) { setBidError('Enter a valid amount'); return; }
                    const res = await fetch('/api/auction/bid', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        auction_id: selectedAuction.id,
                        bidder_id: user.id,
                        amount: amountNum,
                      })
                    });
                    
                    const data = await res.json();
                    if (!res.ok) {
                      setBidError(data.error || 'Failed to place bid');
                    } else {
                      setSelectedAuction(null); 
                      setBidAmount(''); 
                    }
                  } catch (e) { setBidError(String(e)); }
                  finally { setIsSubmitting(false); }
                }}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#3d0000] hover:bg-[#590000] text-[#b08d55] dark:bg-[var(--heritage-gold)] dark:text-[#3d0000] rounded"
              >{isSubmitting ? t('common.submitting', 'Submitting...') : t('auctions.placeBid', 'Place Bid')}</button>
            </div>
            {/* Recent Bids */}
            <div className="mt-4">
              <h3 className="font-semibold mb-2">{t('auctions.recentBids', 'Recent Bids')}</h3>
              <ul>
                {selectedAuction.bids && selectedAuction.bids.slice(0, 5).map((b, i) => (
                  <li key={i} className="text-sm">User {i + 1}: ₹{b.amount.toLocaleString()}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

// Helper to determine auction status based on current time
function getAuctionStatus(auction: AuctionRow, now: number): { status: string; end?: number | null } {
  const start = auction.starts_at ? new Date(auction.starts_at).getTime() : 0;
  const end = auction.ends_at ? new Date(auction.ends_at).getTime() : null;
  const explicitStatus = auction.status?.toLowerCase().trim();
  const isExplicitlyActive = explicitStatus === 'running' || explicitStatus === 'upcoming' || explicitStatus === 'active';
  if (explicitStatus && !isExplicitlyActive) return { status: 'ended', end };
  if (now < start) return { status: 'upcoming', end };
  if (end !== null && now > end) return { status: 'ended', end };
  return { status: 'running', end };
}

function AuctionCard({ auction, title, currentPrice, t, onSelectAuction, isAuthenticated }: { auction: AuctionRow, title: string, currentPrice: number, t: TranslationFunction, onSelectAuction: (a: AuctionRow) => void, isAuthenticated: boolean }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = auction.starts_at ? new Date(auction.starts_at).getTime() : 0;
  const end = auction.ends_at ? new Date(auction.ends_at).getTime() : null; 

  const { status, end: auctionEnd } = getAuctionStatus(auction, now);
  let timerDisplay = '';
  if (status === 'ended') {
    timerDisplay = t('auctions.auctionEnded', 'Auction Ended');
  } else if (status === 'upcoming') {
    const diff = start - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const startsInLabel = t('auctions.startsIn', 'Starts in');
    timerDisplay = days > 0 ? `${startsInLabel} ${days}d ${hrs}h` : `${startsInLabel} ${hrs}h ${mins}m`;
  } else {
    const diff = (auctionEnd ?? Date.now()) - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    timerDisplay = days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const isActive = status === 'running';
  return <div className="group relative bg-white/30 dark:bg-[var(--card)] rounded-xl overflow-hidden border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full backdrop-blur-lg">
    <Link href={`/product/${auction.product_id}`} className="flex flex-col flex-grow cursor-pointer">
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
        ) : (
          <span className="text-gray-500">{t('auctions.endedStatus', 'ENDED')}</span>
        )}
      </div>
    </div>

    <div className="p-5 flex flex-col flex-grow">
      <h3 className="font-serif font-bold text-xl text-[var(--heritage-brown)] dark:text-[var(--heritage-gold)] mb-2 line-clamp-1 group-hover:underline" title={title}>
        {title}
      </h3>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('auctions.currentBidLabel', 'Current Bid')}</p>
          <p className="text-2xl font-bold text-[var(--heritage-red)] dark:text-[var(--heritage-white)]">₹{currentPrice.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('auctions.timeLeft', 'Time Left')}</p>
          <div className={`text-lg font-mono font-medium flex items-center justify-end gap-1 ${isActive ? 'text-[var(--heritage-brown)] dark:text-[var(--heritage-gold)]' : 'text-gray-400'}`}>
            <Clock className="w-4 h-4" />
            {timerDisplay}
          </div>
        </div>
      </div>

      </div>
    </Link>

    <div className="px-5 pb-5 mt-auto">
      <div className="pt-4 border-t border-[var(--border)]">
        {isActive ? (
          isAuthenticated ? (
            <button
              type="button"
              onClick={() => onSelectAuction(auction)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all shadow-md hover:bg-[#590000] bg-[#3d0000] text-[#b08d55] dark:bg-[var(--heritage-gold)] dark:text-[#3d0000] dark:hover:bg-white"
            >
              {t('auctions.placeBid', 'Place Bid')} <Hammer className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/auth/signin">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-gray-400 text-white cursor-not-allowed"
              >
                {t('auctions.loginToBid', 'Login to Bid')}
              </button>
            </Link>
          )
        ) : (
          <Link
            href={`/product/${auction.product_id}`}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all shadow-md bg-white border-2 border-[var(--heritage-gold)] text-[var(--heritage-brown)] hover:bg-[var(--heritage-gold)] hover:text-white dark:bg-transparent dark:border-[var(--muted)] dark:text-[var(--muted)] dark:hover:border-[var(--text)] dark:hover:text-[var(--text)]"
          >
            {t('auctions.viewDetails', 'View Details')} <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  </div>
}
