import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding-service';

// Don't use edge runtime - the embedding model needs Node.js environment
// export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('Search query:', query);

    // Generate an embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Generated embedding length:', queryEmbedding.length);

    // Query Supabase for similar products using the pgvector extension
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Lower threshold = more lenient matching
      match_count: 20,
    });

    if (error) {
      console.error('Error matching products:', error);
      return NextResponse.json({ error: 'Failed to match products' }, { status: 500 });
    }

    console.log('Matched products count:', data?.length || 0);
    console.log('Sample results:', data?.slice(0, 2));

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

