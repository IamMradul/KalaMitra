import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod';
import { auctionRateLimit } from '@/lib/rate-limit';
import { localRateLimit } from '@/lib/local-limit';

const bidSchema = z.object({
  auction_id: z.string().uuid(),
  bidder_id: z.string().uuid(),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting with Fallback
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    let isAllowed = true;
    let limitInfo = { limit: 5, remaining: 5, reset: 0 };

    try {
      // 1a. Try high-performance Upstash Limit first
      const { success, limit, reset, remaining } = await auctionRateLimit.limit(ip);
      isAllowed = success;
      limitInfo = { limit, remaining, reset };
    } catch (ratelimitError) {
      // 1b. IF UPSTASH IS GONE, use Code-Based Local Memory Limit (5 requests / 10s)
      console.warn('Upstash rate limiting unavailable, falling back to local memory limit.');
      const localResult = localRateLimit(`auction:${ip}`, 5, 10000);
      isAllowed = localResult.success;
      limitInfo = { limit: 5, remaining: localResult.remaining, reset: Date.now() + 10000 };
    }
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limitInfo.limit.toString(),
            'X-RateLimit-Remaining': limitInfo.remaining.toString(),
            'X-RateLimit-Reset': limitInfo.reset.toString(),
          }
        }
      );
    }

    // 2. Validation
    const body = await req.json();
    const result = bidSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid bid data', details: result.error.format() }, { status: 400 });
    }

    const { auction_id, bidder_id, amount } = result.data;
    
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
