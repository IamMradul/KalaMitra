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

    const VIRTUAL_KEYWORD_REGEX = /\b(recipe|pdf|tutorial|guide|pattern|instruction|digital|download|ebook|course|kolam|rangoli|template|templates)\b/i;
    const detectedVirtual = VIRTUAL_KEYWORD_REGEX.test((title || '') + ' ' + (description || ''));
    const resolvedIsVirtual = isVirtual !== undefined ? isVirtual : detectedVirtual;

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
      const msg = `❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\nInappropriate or adult-related content detected.\n\nPlease upload an appropriate product and try again.`;
      
      // Server-side notification insertion to bypass RLS policies
      if (userId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Inappropriate Content Upload Rejected',
          body: 'Inappropriate content upload rejected. For further info, contact talkto.kalamitra@gmail.com',
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

    const approved = isModerationApproved(result, resolvedIsVirtual, title, description);

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
      const msg = `❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\n${reason}\n\nPlease upload an appropriate product and try again.`;
      
      // Server-side notification insertion to bypass RLS policies
      if (userId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Inappropriate Content Upload Rejected',
          body: 'Inappropriate content upload rejected. For further info, contact talkto.kalamitra@gmail.com',
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

    // Check if the error is due to a safety block
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isSafetyBlock = /safety|block|candidate|finishReason|unsuitable|inappropriate|explicit|harm/i.test(errorMsg);

    if (isSafetyBlock) {
      const msg = `❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\nContent violated safety or moderation guidelines.\n\nPlease upload an appropriate product and try again.`;

      if (userId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Inappropriate Content Upload Rejected',
          body: 'Inappropriate content upload rejected. For further info, contact talkto.kalamitra@gmail.com',
        });
        if (notifError) {
          console.error('[product-moderation] Failed to create server-side safety rejection notification:', notifError);
        }
      }
      return NextResponse.json(
        {
          approved: false,
          result: {
            approved: false,
            confidence: 99,
            category: 'other',
            handmade_product: false,
            contains_nudity: true,
            contains_sexual_content: true,
            contains_sex_toys: true,
            contains_profanity: true,
            contains_hate_speech: false,
            contains_violence: false,
            contains_gore: false,
            contains_weapons: false,
            contains_drugs: false,
            contains_extremism: false,
            contains_spam: false,
            contains_deceptive_content: false,
            marketplace_safe: false,
            reason: 'Content violated safety or moderation guidelines.',
          },
          message: msg,
        },
        { status: 403 }
      );
    }

    // Fallback: If it's a model rate limit, network issue, or API key issue, allow the upload to proceed in 'pending' moderation status
    console.warn('[product-moderation] API or Key failure detected. Fallback to pending moderation.');
    return NextResponse.json({
      approved: true,
      moderation_status: 'pending',
      result: {
        approved: true,
        confidence: 0,
        category: 'other',
        handmade_product: true,
        contains_nudity: false,
        contains_sexual_content: false,
        contains_sex_toys: false,
        contains_profanity: false,
        contains_hate_speech: false,
        contains_violence: false,
        contains_gore: false,
        contains_weapons: false,
        contains_drugs: false,
        contains_extremism: false,
        contains_spam: false,
        contains_deceptive_content: false,
        marketplace_safe: true,
        reason: 'Moderation check skipped due to service unavailability.',
      }
    });
  }
}
