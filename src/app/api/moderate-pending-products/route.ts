import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  moderateImageWithGemini,
  isModerationApproved,
  fetchImageAsBase64,
  type ProductModerationResult,
} from '@/lib/product-moderation';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all products with pending moderation comment tags in description
    const { data: pendingProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .like('description', '%<!-- moderation_status: pending -->%');

    if (fetchError) {
      console.error('[moderate-pending-products] Error fetching pending products:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingProducts || pendingProducts.length === 0) {
      return NextResponse.json({ processed: 0, approved: 0, rejected: 0, message: 'No pending products found.' });
    }

    let approvedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;

    // 2. Process each product
    for (const product of pendingProducts) {
      try {
        console.log(`[moderate-pending-products] Moderating product: ${product.title} (ID: ${product.id})`);
        
        if (!product.image_url) {
          // If no image, approve directly as safe and clean tag
          const cleanDescription = product.description
            .replace('\n<!-- moderation_status: pending -->', '')
            .replace('<!-- moderation_status: pending -->', '');

          await supabase
            .from('products')
            .update({ description: cleanDescription })
            .eq('id', product.id);
          approvedCount++;
          continue;
        }

        // Fetch image as base64
        const fetched = await fetchImageAsBase64(product.image_url);

        // Call Gemini Vision to moderate the listing
        const result: ProductModerationResult = await moderateImageWithGemini(
          fetched.base64,
          fetched.mimeType,
          product.title,
          product.description,
          product.is_virtual
        );

        const approved = isModerationApproved(result, product.is_virtual, product.title, product.description);

        if (approved) {
          console.log(`[moderate-pending-products] Product APPROVED: ${product.title}`);
          const cleanDescription = product.description
            .replace('\n<!-- moderation_status: pending -->', '')
            .replace('<!-- moderation_status: pending -->', '');

          const { error: updateError } = await supabase
            .from('products')
            .update({ description: cleanDescription })
            .eq('id', product.id);

          if (updateError) {
            console.error(`[moderate-pending-products] Failed to update product status:`, updateError);
            failedCount++;
          } else {
            approvedCount++;
          }
        } else {
          console.log(`[moderate-pending-products] Product REJECTED: ${product.title}. Reason: ${result.reason}`);
          
          // Delete product
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', product.id);

          if (deleteError) {
            console.error(`[moderate-pending-products] Failed to delete product:`, deleteError);
            failedCount++;
            continue;
          }

          // Create notification for seller
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: product.seller_id,
            title: 'Inappropriate Content Upload Rejected',
            body: 'Inappropriate content upload rejected. For further info, contact talkto.kalamitra@gmail.com',
          });

          if (notifError) {
            console.error(`[moderate-pending-products] Failed to create notification:`, notifError);
          }

          rejectedCount++;
        }
      } catch (err) {
        console.error(`[moderate-pending-products] Failed to process product ${product.id} due to API/network error:`, err);
        failedCount++;
        // Stop processing further if rate-limit/quota issue detected to avoid repeatedly failing
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota') || errMsg.includes('API key')) {
          console.warn('[moderate-pending-products] Rate-limiting or key issue detected, stopping current run.');
          break;
        }
      }
    }

    return NextResponse.json({
      processed: pendingProducts.length,
      approved: approvedCount,
      rejected: rejectedCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error('[moderate-pending-products] Route failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
