import { NextRequest, NextResponse } from 'next/server';
import { MODERATION_REJECTED_MESSAGE } from '@/lib/product-moderation-messages';
import {
  fetchImageAsBase64,
  isModerationApproved,
  moderateImageWithGemini,
  scanTextForVulgarity,
  type ProductModerationResult,
} from '@/lib/product-moderation';
import { supabase } from '@/lib/supabase';

const MAX_BASE64_LENGTH = 14_000_000; // ~10 MB image as base64

/**
 * POST /api/moderate-product-image
 *
 * Backend moderation gate — must be called before any product image is stored.
 * Accepts either { imageBase64, mimeType } or { imageUrl }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, imageUrl, title, description, userId, isVirtual } = body as {
      imageBase64?: string;
      mimeType?: string;
      imageUrl?: string;
      title?: string;
      description?: string;
      userId?: string;
      isVirtual?: boolean;
    };

    const VIRTUAL_KEYWORD_REGEX = /\b(recipe|cook|culinary|artisan|technique|pottery|clay|craft|tutorial|guide|pattern|clothes|design|sew|paint|art|diy|instruction|digital|pdf)\b/i;
    const detectedVirtual = VIRTUAL_KEYWORD_REGEX.test((title || '') + ' ' + (description || ''));
    const resolvedIsVirtual = isVirtual || detectedVirtual;

    let base64 = imageBase64;
    let resolvedMimeType = mimeType || 'image/jpeg';

    if (!base64 && imageUrl) {
      const fetched = await fetchImageAsBase64(imageUrl);
      base64 = fetched.base64;
      resolvedMimeType = fetched.mimeType;
    }

    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 or imageUrl is required' },
        { status: 400 }
      );
    }

    if (base64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Image is too large for moderation' },
        { status: 413 }
      );
    }

    // Offline pre-check: immediately reject if vulgarity/nudity/inappropriate terms are found in title or description
    if ((title && scanTextForVulgarity(title)) || (description && scanTextForVulgarity(description))) {
      const msg = `❌ Product Upload Rejected\n\nThis marketplace only accepts genuine handmade products.\n\nReason:\nInappropriate or vulgar content detected.\n\nPlease upload an appropriate handmade product and try again.`;
      
      // Server-side notification insertion to bypass RLS policies
      if (userId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Inappropriate Content Uploaded',
          body: 'Your product upload was rejected because it contains inappropriate or vulgar content.',
        });
        if (notifError) {
          console.error('[product-moderation] Failed to create server-side rejection notification:', notifError);
        }
      }

      return NextResponse.json(
        {
          approved: false,
          result: { reason: 'Vulgar or profane text detected' },
          message: msg,
        },
        { status: 403 }
      );
    }

    // STEP 1–3: Gemini Vision analysis evaluating both image and text inputs
    const result: ProductModerationResult = await moderateImageWithGemini(
      base64,
      resolvedMimeType,
      title,
      description,
      resolvedIsVirtual
    );

    const approved = isModerationApproved(result, resolvedIsVirtual);

    // Log moderation outcome for debugging (no image data logged)
    console.log('[product-moderation]', {
      approved,
      confidence: result.confidence,
      category: result.category,
      handmade_product: result.handmade_product,
      contains_nudity: result.contains_nudity,
      contains_sexual_content: result.contains_sexual_content,
      contains_sex_toys: result.contains_sex_toys,
      contains_profanity: result.contains_profanity,
      contains_hate_speech: result.contains_hate_speech,
      contains_violence: result.contains_violence,
      contains_gore: result.contains_gore,
      contains_weapons: result.contains_weapons,
      contains_drugs: result.contains_drugs,
      contains_extremism: result.contains_extremism,
      contains_spam: result.contains_spam,
      contains_deceptive_content: result.contains_deceptive_content,
      marketplace_safe: result.marketplace_safe,
      reason: result.reason,
      source: imageUrl ? 'url' : 'base64',
    });

    // STEP 4: Enforce rejection rules
    if (!approved) {
      const reason = result.reason || 'Violates safety guidelines.';
      const msg = `❌ Product Upload Rejected\n\nThis marketplace only accepts genuine handmade products.\n\nReason:\n${reason}\n\nPlease upload an appropriate handmade product and try again.`;
      
      // Server-side notification insertion to bypass RLS policies
      if (userId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Inappropriate Content Uploaded',
          body: 'Your product upload was rejected because it contains inappropriate or vulgar content.',
        });
        if (notifError) {
          console.error('[product-moderation] Failed to create server-side rejection notification:', notifError);
        }
      }

      return NextResponse.json(
        {
          approved: false,
          result,
          message: msg,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      approved: true,
      result,
    });
  } catch (error) {
    console.error('[product-moderation] Moderation failed:', error);
    return NextResponse.json(
      {
        approved: false,
        message: '⚠ Unable to verify product content at the moment.\nPlease try again later.',
      },
      { status: 503 }
    );
  }
}
