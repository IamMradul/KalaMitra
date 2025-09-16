import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { auction_id, bidder_id, amount } = body
    if (!auction_id || !bidder_id || !amount) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    // validate auction
    const { data: auction } = await supabase.from('auctions').select('*').eq('id', auction_id).single()
    if (!auction) return NextResponse.json({ error: 'auction not found' }, { status: 404 })
    // ensure auction is running and not past end time
    if (auction.status !== 'running') return NextResponse.json({ error: 'auction not running' }, { status: 400 })
    if (auction.ends_at) {
      const endTs = new Date(auction.ends_at).getTime()
      if (endTs <= Date.now()) return NextResponse.json({ error: 'auction has ended' }, { status: 400 })
    }

    // get highest bid
    const { data: bids } = await supabase.from('bids').select('*').eq('auction_id', auction_id).order('amount', { ascending: false }).limit(1)
    const highest = bids?.[0]?.amount ?? auction.starting_price
    if (amount <= highest) return NextResponse.json({ error: 'bid must be higher than current' }, { status: 400 })

    const { error } = await supabase.from('bids').insert({ auction_id, bidder_id, amount })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
