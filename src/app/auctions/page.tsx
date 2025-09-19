"use client"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray } from '@/lib/translate'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'


type AuctionRow = {
  id: string
  product_id: string
  status?: string
  starting_price?: number
  product?: { title?: string; image_url?: string; price?: number }
}


async function fetchAuctions() {
  const { data, error } = await supabase
    .from('auctions')
    .select('*, product:products(title, image_url, price)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">{t('common.loading')}</p></div></div>
  }

  return (
    <div className="min-h-screen heritage-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-6">{t('auctions.title', 'Auctions')}</h1>
        <div className="card-glass p-4 rounded-lg">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((a: AuctionRow, idx) => (
              <div key={a.id} className="card rounded-lg border p-4">
                <div className="h-48 bg-[var(--bg-2)] flex items-center justify-center mb-3 overflow-hidden rounded">
                  {a.product?.image_url ? <Image src={a.product.image_url} alt={displayTitles[idx] || a.product?.title || 'product'} width={600} height={400} className="w-full h-full object-cover" /> : <div className="text-[var(--muted)]">No image</div>}
                </div>
                <h3 className="font-semibold mb-1 text-[var(--text)]">{displayTitles[idx] || a.product?.title || 'Untitled'}</h3>
                <div className="text-sm text-[var(--muted)] mb-2">{t('auctions.status', 'Status')}: {a.status}</div>
                <div className="text-lg font-bold text-orange-500">₹{a.starting_price}</div>
                <div className="mt-3 flex space-x-2">
                  <Link href={`/product/${a.product_id}`} className="px-3 py-2 bg-orange-500 text-white rounded">{t('auctions.view', 'View')}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
