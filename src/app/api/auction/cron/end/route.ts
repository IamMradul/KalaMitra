import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: End auctions whose ends_at <= now and are running or scheduled
export async function POST(req: Request) {
  try {
    const now = new Date().toISOString()
    // select auctions that should be ended
    const { data: toEnd, error: selErr } = await supabase
      .from('auctions')
      .select('*')
      .or(`and(ends_at.lte.${now},status.eq.running),and(ends_at.lte.${now},status.eq.scheduled)`)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })
    if (!toEnd || toEnd.length === 0) return NextResponse.json({ ended: 0 })

    let ended = 0
    for (const a of toEnd) {
      // Log auction id and seller_id for debugging
      console.log('Ending auction:', { auction_id: a.id, seller_id: a.seller_id });
      try {
        const { data: bids } = await supabase.from('bids').select('*').eq('auction_id', a.id).order('amount', { ascending: false }).limit(1)
  const winner = bids?.[0]
  const updates: Partial<{ status: string; winner_id?: string | null }> = { status: 'completed' }
  if (winner) updates.winner_id = winner.bidder_id
        const { error: updErr } = await supabase.from('auctions').update(updates).eq('id', a.id)
        if (updErr) {
          console.error('failed to update auction', a.id, updErr)
          continue
        }
        // Notify winner (buyer)
        if (winner) {
          try {
            // fetch product title if available
            let productTitle = a.product_id
            try {
              const { data: p } = await supabase.from('products').select('title').eq('id', a.product_id).single()
              if (p?.title) productTitle = p.title
            } catch {}

            await supabase.from('notifications').insert({
              user_id: winner.bidder_id,
              title: 'You won an auction!',
              body: `You won the auction for "${productTitle}" with bid ₹${winner.amount}. Please visit your dashboard to pay and claim the item.`,
              read: false,
              metadata: { auction_id: a.id, product_id: a.product_id, product_title: productTitle, amount: winner.amount }
            })
          } catch (nerr) {
            console.error('notification insert failed', nerr)
          }
        }
        // Notify seller
        try {
          let productTitle = a.product_id
          try {
            const { data: p } = await supabase.from('products').select('title').eq('id', a.product_id).single()
            if (p?.title) productTitle = p.title
          } catch {}
          const sellerNotification = {
            user_id: a.seller_id,
            title: 'Your auction has completed!',
            body: `Your scheduled auction for "${productTitle}" has completed! Go to your dashboard to verify the results and manage the outcome.`,
            read: false,
            metadata: { auction_id: a.id, product_id: a.product_id, product_title: productTitle }
          };
          if (!a.seller_id) {
            console.error('No seller_id for auction', a.id, a);
          }
          const { error: sellerNotifError } = await supabase.from('notifications').insert(sellerNotification);
          if (sellerNotifError) {
            console.error('seller notification insert failed', sellerNotifError, sellerNotification);
            // Try again with minimal notification (no metadata)
            const minimalNotification = {
              user_id: a.seller_id,
              title: 'Your auction has completed!',
              body: `Your scheduled auction for "${productTitle}" has completed! Go to your dashboard to verify the results and manage the outcome.`,
              read: false
            };
            const { error: minimalNotifError } = await supabase.from('notifications').insert(minimalNotification);
            if (minimalNotifError) {
              console.error('minimal seller notification insert failed', minimalNotifError, minimalNotification);
            } else {
              console.log('Minimal seller notification inserted successfully', minimalNotification);
            }
          }
        } catch (nerr) {
          console.error('seller notification insert failed (exception)', nerr, a);
        }
        ended++
      } catch (err: unknown) {
        console.error('error ending auction', a.id, err)
      }
    }

    return NextResponse.json({ ended })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
