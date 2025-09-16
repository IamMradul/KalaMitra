import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: create auction (seller)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { product_id, starting_price, starts_at, ends_at, seller_id } = body
    const { data, error } = await supabase.from('auctions').insert({
      product_id,
      seller_id,
      starting_price,
      starts_at: starts_at ?? null,
      ends_at: ends_at ?? null,
      status: starts_at && new Date(starts_at) > new Date() ? 'scheduled' : 'running'
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ auction: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const product_id = url.searchParams.get('product_id')
    if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

    const { data, error } = await supabase.from('auctions').select('*').eq('product_id', product_id).order('created_at', { ascending: false }).limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ auction: data?.[0] ?? null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
