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

export default async function AuctionsPage() {
  const auctions = await fetchAuctions()

    return (
      <div className="min-h-screen heritage-bg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-6">Auctions</h1>
          <div className="card-glass p-4 rounded-lg">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((a: AuctionRow) => (
            <div key={a.id} className="card rounded-lg border p-4">
              <div className="h-48 bg-[var(--bg-2)] flex items-center justify-center mb-3 overflow-hidden rounded">
                {a.product?.image_url ? <Image src={a.product.image_url} alt={a.product?.title || 'product'} width={600} height={400} className="w-full h-full object-cover" /> : <div className="text-[var(--muted)]">No image</div>}
              </div>
              <h3 className="font-semibold mb-1 text-[var(--text)]">{a.product?.title || 'Untitled'}</h3>
              <div className="text-sm text-[var(--muted)] mb-2">Status: {a.status}</div>
              <div className="text-lg font-bold text-orange-500">₹{a.starting_price}</div>
              <div className="mt-3 flex space-x-2">
                <Link href={`/product/${a.product_id}`} className="px-3 py-2 bg-orange-500 text-white rounded">View</Link>
              </div>
            </div>
          ))}
            </div>
          </div>
      </div>
    </div>
  )
}
