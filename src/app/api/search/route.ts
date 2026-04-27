import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding-service';
import { z } from 'zod';
import { searchRateLimit } from '@/lib/rate-limit';
import { localRateLimit } from '@/lib/local-limit';

const searchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
});

// Don't use edge runtime - the embedding model needs Node.js environment
// export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting with Fallback
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    let isAllowed = true;
    let limitInfo = { limit: 10, remaining: 10, reset: 0 };

    try {
      // 1a. Try high-performance Upstash Limit first
      const { success, limit, reset, remaining } = await searchRateLimit.limit(ip);
      isAllowed = success;
      limitInfo = { limit, remaining, reset };
    } catch (ratelimitError) {
      // 1b. IF UPSTASH IS GONE, use Code-Based Local Memory Limit (10 requests / 10s)
      console.warn('Upstash rate limiting unavailable, falling back to local memory limit.');
      const localResult = localRateLimit(`search:${ip}`, 10, 10000);
      isAllowed = localResult.success;
      limitInfo = { limit: 10, remaining: localResult.remaining, reset: Date.now() + 10000 };
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
    const result = searchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
    }

    const { query } = result.data;

    console.log('Search query:', query);

    // Generate an embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Generated embedding length:', queryEmbedding.length);

    // Query Supabase for similar products using the pgvector extension
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2, // Lowered to 0.2 for better typo tolerance
      match_count: 20,
    });

    if (error) {
      console.error('Error matching products:', error);
      return NextResponse.json({ error: 'Failed to match products' }, { status: 500 });
    }

    // Attach seller names so semantic search results are self-sufficient in UI.
    const sellerIds = [...new Set((data || []).map((p: any) => p?.seller_id).filter(Boolean))] as string[]
    const sellerNameMap = new Map<string, string>()
    if (sellerIds.length > 0) {
      const { data: sellerRows, error: sellerError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sellerIds)
      if (sellerError) {
        console.warn('Error fetching seller names for search results:', sellerError)
      } else {
        for (const row of sellerRows || []) {
          if (row?.id) sellerNameMap.set(row.id, row.name || 'Unknown')
        }
      }
    }

    const enrichedData = (data || []).map((p: any) => ({
      ...p,
      seller: { name: sellerNameMap.get(p?.seller_id) || 'Unknown' },
    }))

    console.log('Matched products count:', data?.length || 0);
    console.log('Sample results:', enrichedData?.slice(0, 2));

    return NextResponse.json(enrichedData);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

