import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchImageAsBase64,
  isModerationApproved,
  moderateImageWithGemini,
  scanTextForVulgarity,
} from '@/lib/product-moderation';

export const maxDuration = 60; // Allow Vercel to run this for up to 60 seconds
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Authenticate the cron request (Vercel automatically sends this header)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[cron-verify] Starting batch verification of pending products...');

  try {
    // 2. Fetch up to 10 products that are pending moderation
    const { data: pendingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, seller_id, title, description, image_url, is_virtual')
      .eq('moderation_status', 'pending')
      .limit(10);

    if (fetchError) throw fetchError;
    if (!pendingProducts || pendingProducts.length === 0) {
      return NextResponse.json({ message: 'No pending products found.' });
    }

    const results = [];

    // 3. Process each product
    for (const product of pendingProducts) {
      if (!product.image_url) {
        // Text-only listing: Do NOT bypass moderation! We must check the text.
        const isVulgar = scanTextForVulgarity(product.title) || scanTextForVulgarity(product.description);
        const finalStatus = isVulgar ? 'rejected' : 'approved';
        
        await updateProductStatus(product.id, finalStatus);

        if (isVulgar) {
          await supabase.from('notifications').insert({
            user_id: product.seller_id,
            title: 'Product Rejected - Moderation Failed',
            body: `Your text-only product "${product.title}" was rejected due to: Inappropriate or profane language detected.`,
          });
        } else {
          await supabase.from('notifications').insert({
            user_id: product.seller_id,
            title: 'Product Approved',
            body: `Good news! Your text-only product "${product.title}" has been verified and is now live on your stall!`,
          });
        }
        continue;
      }

      try {
        const { base64, mimeType } = await fetchImageAsBase64(product.image_url);
        
        const geminiResult = await moderateImageWithGemini(
          base64,
          mimeType,
          product.title,
          product.description,
          product.is_virtual || false
        );

        const isApproved = isModerationApproved(
          geminiResult, 
          product.is_virtual || false, 
          product.title, 
          product.description
        );

        const finalStatus = isApproved ? 'approved' : 'rejected';
        
        // Update database
        await updateProductStatus(product.id, finalStatus);
        
        // Notify user if rejected or approved
        if (!isApproved) {
          await supabase.from('notifications').insert({
            user_id: product.seller_id,
            title: 'Product Rejected - Moderation Failed',
            body: `Your product "${product.title}" was rejected due to: ${geminiResult.reason}`,
          });
        } else {
          await supabase.from('notifications').insert({
            user_id: product.seller_id,
            title: 'Product Approved',
            body: `Good news! Your product "${product.title}" has been verified and is now live on your stall!`,
          });
        }

        results.push({ id: product.id, status: finalStatus });
      } catch (err) {
        console.error(`[cron-verify] Error verifying product ${product.id}:`, err);
        // Leave it as pending to retry next time
      }
    }

    return NextResponse.json({ message: 'Batch complete', processed: results.length, results });
  } catch (error) {
    console.error('[cron-verify] Fatal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function updateProductStatus(productId: string, status: 'approved' | 'rejected') {
  await supabase
    .from('products')
    .update({ moderation_status: status })
    .eq('id', productId);
}
