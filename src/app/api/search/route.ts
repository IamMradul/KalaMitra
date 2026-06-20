import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding-service';
import { z } from 'zod';
import { searchRateLimit } from '@/lib/rate-limit';
import { localRateLimit } from '@/lib/local-limit';
import { analyzeQuery } from '@/lib/search-intent';

const searchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  userId: z.string().optional(),
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
      const { success, limit, reset, remaining } = await searchRateLimit.limit(ip);
      isAllowed = success;
      limitInfo = { limit, remaining, reset };
    } catch (ratelimitError) {
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

    const { query, userId } = result.data;

    // 3. Analyze Query (Intent + Synonyms)
    const analysis = analyzeQuery(query);
    const searchString = analysis.expansion.length > 0
      ? `${analysis.corrected} ${analysis.expansion.join(' ')}`
      : analysis.corrected;

    console.log(`\n[Search API] === New Search Request ===`);
    console.log(`[Search API] Original: "${query}"`);
    console.log(`[Search API] Corrected: "${analysis.corrected}"`);
    console.log(`[Search API] Search String (with expansions): "${searchString}"`);

    // Generate an embedding for the corrected/expanded query
    const queryEmbedding = await generateEmbedding(searchString);
    console.log(`[Search API] Embedding generation: ${queryEmbedding ? 'SUCCESS (vector length: ' + queryEmbedding.length + ')' : 'FAILED'}`);

    // 4. Hybrid Search 
    const { data: semanticData, error: semanticError } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.15, // Lowered threshold for broader intent
      match_count: 30,
    });

    console.log(`[Search API] Semantic search returned: ${semanticData?.length || 0} matches.`);

    if (semanticError) {
      console.error('[Search API] Error matching products:', semanticError);
    }

    // 4.5 Exact Text Search (covers cases where embeddings are missing or threshold is missed)
    let textQueryParts = [
      `title.ilike."%${analysis.corrected}%"`,
      `description.ilike."%${analysis.corrected}%"`,
      `category.ilike."%${analysis.corrected}%"`
    ];

    // Also search for the expanded intents in the text search to be thorough
    analysis.expansion.forEach(exp => {
      textQueryParts.push(
        `title.ilike."%${exp}%"`,
        `description.ilike."%${exp}%"`,
        `category.ilike."%${exp}%"`
      );
    });

    const orQuery = textQueryParts.join(',');

    const { data: textData, error: textError } = await supabase
      .from('products')
      .select('*')
      .or(orQuery)
      .limit(30);

    console.log(`[Search API] Text search returned: ${textData?.length || 0} matches.`);

    if (textError) {
      console.error('[Search API] Error in text search:', textError);
    }

    let combinedResults = [...(textData || []), ...(semanticData || [])];

    // Remove duplicates
    const uniqueMap = new Map();
    combinedResults.forEach((p: any) => {
      if (p && p.id && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    combinedResults = Array.from(uniqueMap.values());
    console.log(`[Search API] Combined unique results before fallback check: ${combinedResults.length}`);

    // 5. Smart Fallback Engine
    let isFallback = false;
    if (combinedResults.length === 0) {
      console.log(`[Search API] 0 results found! Triggering fallback...`);
      isFallback = true;
      // Ultimate fallback: just return latest products
      const { data: ultimateFallback } = await supabase
        .from('products')
        .select('*')
        .limit(12)
        .order('created_at', { ascending: false });
      combinedResults = ultimateFallback || [];
      console.log(`[Search API] Fallback returned ${combinedResults.length} default products.`);
    }

    // 6. Enrichment (Seller Names)
    const sellerIds = [...new Set((combinedResults).map((p: any) => p?.seller_id).filter(Boolean))] as string[]
    const sellerNameMap = new Map<string, string>()
    if (sellerIds.length > 0) {
      const { data: sellerRows, error: sellerError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sellerIds)
      if (!sellerError) {
        for (const row of sellerRows || []) {
          if (row?.id) sellerNameMap.set(row.id, row.name || 'Unknown')
        }
      }
    }

    const enrichedData = combinedResults.map((p: any) => ({
      ...p,
      seller: { name: sellerNameMap.get(p?.seller_id) || 'Unknown' },
    }));

    return NextResponse.json({
      results: enrichedData.slice(0, 20),
      meta: {
        originalQuery: analysis.original,
        correctedQuery: analysis.isCorrected ? analysis.corrected : null,
        isFallback,
        expandedIntents: analysis.expansion
      }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

