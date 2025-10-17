
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding-service';

// We can't use the edge runtime here because the embedding model
// needs to be downloaded and cached on the server, which isn't supported on the edge.

export async function GET() {
  try {
    // 1. Fetch all products that don't have an embedding yet
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, title, description, category')
      .is('embedding', null);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ message: 'All products already have embeddings.' });
    }

    // 2. Generate and update embeddings for each product
    for (const product of products) {
      // Combine text fields to create a rich source for the embedding
      const inputText = `Title: ${product.title || ''}; Category: ${product.category || ''}; Description: ${product.description || ''}`;
      
      const embedding = await generateEmbedding(inputText);

      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding })
        .eq('id', product.id);

      if (updateError) {
        console.warn(`Failed to update embedding for product ${product.id}:`, updateError.message);
      } else {
        console.log(`Successfully generated and saved embedding for product ${product.id}`);
      }
    }

    return NextResponse.json({
      message: `Successfully generated embeddings for ${products.length} products.`,
    });

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred during backfill', details: errorMessage }, { status: 500 });
  }
}
