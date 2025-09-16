import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: end auction, pick winner
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { auction_id } = body
    if (!auction_id) return NextResponse.json({ error: 'auction_id required' }, { status: 400 })

    const { data: auction } = await supabase.from('auctions').select('*').eq('id', auction_id).single()
    if (!auction) return NextResponse.json({ error: 'auction not found' }, { status: 404 })

    const { data: bids } = await supabase.from('bids').select('*').eq('auction_id', auction_id).order('amount', { ascending: false }).limit(1)
  const winner = bids?.[0]
  const updates: Partial<{ status: string; winner_id?: string | null }> = { status: 'completed' }
    if (winner) updates.winner_id = winner.bidder_id

    const { error } = await supabase.from('auctions').update(updates).eq('id', auction_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // notify winner: insert a notification row for the winner (prototype)
    if (winner) {
      try {
        // try to fetch product title
        let productTitle = auction.product_id
        try {
          const { data: prod } = await supabase.from('products').select('title').eq('id', auction.product_id).single()
          if (prod?.title) productTitle = prod.title
        } catch {}

        const note = {
          user_id: winner.bidder_id,
          title: 'You won an auction!',
          body: `You won the auction for "${productTitle}" with bid ₹${winner.amount}. Please visit your dashboard to pay and claim the item.`,
          read: false,
          metadata: { auction_id, product_id: auction.product_id, product_title: productTitle, amount: winner.amount }
        }
        await supabase.from('notifications').insert(note)
      } catch (nerr) {
        console.error('failed to insert notification', nerr)
      }
    }

    return NextResponse.json({ winner })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
