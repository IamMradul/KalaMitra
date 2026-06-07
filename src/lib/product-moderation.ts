/**
 * Product image moderation for the handmade marketplace.
 *
 * Flow:
 * 1. Image is sent to Gemini Vision with a structured moderation prompt.
 * 2. Gemini returns JSON classifying the image as APPROVED or REJECTED.
 * 3. `isModerationApproved()` enforces all safety rules before upload/save.
 *
 * This module is server-only (called from API routes).
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export {
  MODERATION_API_FAILURE_MESSAGE,
  MODERATION_REJECTED_MESSAGE,
} from '@/lib/product-moderation-messages';

export type {
  ProductModerationCategory,
  ProductModerationResult,
} from '@/lib/product-moderation-rules';

export {
  isModerationApproved,
  scanTextForVulgarity,
} from '@/lib/product-moderation-rules';

import type { ProductModerationCategory, ProductModerationResult } from '@/lib/product-moderation-rules';
import { isModerationApproved, scanTextForVulgarity } from '@/lib/product-moderation-rules';

/** Gemini moderation prompt — OCR text + visual safety check + title/description context */
export const PRODUCT_MODERATION_PROMPT = `Analyze this marketplace listing.

Inputs:
* Product image(s)
* Product title
* Product description

Determine whether this listing contains adult products, sex toys, nudity, or sexually explicit content.

Evaluate:
1. Is the product a sex toy (e.g., vibrator, dildos, adult novelty items)?
2. Does the image, title, or description contain nudity or sexually explicit/erotic content?
3. Set approved to false ONLY if it is a sex toy, adult/sex product, or contains nudity/sexually explicit content. Otherwise, set approved to true.

Constraints:
* Do NOT reject general products, crafts, recipes, clothes, art, tutorials, guides, books, or electronics unless they are sex toys/sex products.
* Return ONLY valid JSON.
* Keep the "reason" field extremely short (1 to 5 words maximum) to prevent truncation.

{
"approved": true,
"confidence": 95,
"category": "other",
"handmade_product": true,
"contains_nudity": false,
"contains_sexual_content": false,
"contains_sex_toys": false,
"contains_profanity": false,
"contains_hate_speech": false,
"contains_violence": false,
"contains_gore": false,
"contains_weapons": false,
"contains_drugs": false,
"contains_extremism": false,
"contains_spam": false,
"contains_deceptive_content": false,
"marketplace_safe": true,
"reason": "Safe listing."
}`;

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

function getGenerativeModel(modelName: string) {
  return getGenAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });
}

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

function parseModerationResponse(
  raw: string,
  isVirtual?: boolean,
  title?: string,
  description?: string
): ProductModerationResult {
  const cleaned = stripCodeFence(raw);
  
  // Quick fallback if completely broken JSON or truncated
  if (scanTextForVulgarity(raw)) {
    return vulgarDetectedResult('Profanity or inappropriate content detected in image text');
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  let jsonString = jsonMatch ? jsonMatch[0] : cleaned;

  let parsed: Partial<ProductModerationResult>;
  try {
    parsed = JSON.parse(jsonString) as Partial<ProductModerationResult>;
  } catch (parseErr) {
    console.warn('[product-moderation] JSON parse error:', parseErr);
    
    // Fallback: Check if it explicitly rejected the image before truncation
    if (jsonString.includes('"approved": false') || jsonString.includes('"approved":false')) {
      return vulgarDetectedResult('Image does not meet handmade marketplace guidelines.');
    }
    throw new Error('Invalid moderation JSON');
  }

  const reason = typeof parsed.reason === 'string' ? parsed.reason : '';
  const vulgarInText = scanTextForVulgarity(reason);

  const result: ProductModerationResult = {
    approved: vulgarInText ? false : Boolean(parsed.approved),
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, parsed.confidence))
        : vulgarInText ? 95 : 0,
    category: typeof parsed.category === 'string' ? parsed.category : 'other',
    handmade_product: Boolean(parsed.handmade_product),
    contains_nudity: Boolean(parsed.contains_nudity),
    contains_sexual_content: Boolean(parsed.contains_sexual_content),
    contains_sex_toys: Boolean(parsed.contains_sex_toys),
    contains_profanity: Boolean(parsed.contains_profanity) || vulgarInText,
    contains_hate_speech: Boolean(parsed.contains_hate_speech),
    contains_violence: Boolean(parsed.contains_violence),
    contains_gore: Boolean(parsed.contains_gore),
    contains_weapons: Boolean(parsed.contains_weapons),
    contains_drugs: Boolean(parsed.contains_drugs),
    contains_extremism: Boolean(parsed.contains_extremism),
    contains_spam: Boolean(parsed.contains_spam),
    contains_deceptive_content: Boolean(parsed.contains_deceptive_content),
    marketplace_safe: Boolean(parsed.marketplace_safe),
    reason: vulgarInText
      ? `Vulgar or profane text detected${reason ? `: ${reason}` : ''}`
      : reason,
  };

  result.approved = isModerationApproved(result, isVirtual, title, description);
  if (!result.approved) {
    result.marketplace_safe = false;
  }

  return result;
}

function vulgarDetectedResult(reason: string): ProductModerationResult {
  return {
    approved: false,
    confidence: 99,
    category: 'other',
    handmade_product: false,
    contains_nudity: false,
    contains_sexual_content: false,
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
    reason,
  };
}

/**
 * Send image, title, and description context to Gemini and parse classification + confidence.
 */
async function callGeminiVision(
  modelName: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
  title?: string,
  description?: string,
  isVirtual?: boolean
): Promise<string> {
  const model = getGenerativeModel(modelName);

  let prompt = PRODUCT_MODERATION_PROMPT;
  if (isVirtual) {
    prompt += `\n\n**CRITICAL ADDITIONAL REQUIREMENT FOR VIRTUAL PRODUCT**:\n` +
      `This is a virtual or digital product.\n` +
      `- You MUST reject ("approved": false) ONLY if the product is a sex toy, sex product, or contains nudity/sexually explicit/erotic content.\n` +
      `- Do NOT reject other virtual product categories (e.g. recipes, guides, templates, tutorials, books). All non-sex-related digital products are allowed.`;
  } else {
    prompt += `\n\n**CRITICAL SAFETY REQUIREMENT**:\n` +
      `- You MUST reject ("approved": false) ONLY if it is a sex toy (like vibrators, dildos, etc.), adult/sex product, or contains nudity/sexually explicit/erotic content.\n` +
      `- Set "contains_sex_toys", "contains_sexual_content", or "contains_nudity" to true if it is a sex toy/product or contains adult/erotic/naked imagery.`;
  }

  const textContext = `
Product details to evaluate:
Product Title: ${title || 'N/A'}
Product Description: ${description || 'N/A'}
`;

  const result = await model.generateContent([
    prompt + '\n\n' + textContext,
    imagePart,
  ]);

  console.log('[product-moderation] response candidates:', JSON.stringify(result.response.candidates, null, 2));

  try {
    return result.response.text().trim();
  } catch {
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    return parts
      .map((p) => ('text' in p ? p.text : ''))
      .join('')
      .trim();
  }
}

export async function moderateImageWithGemini(
  base64Image: string,
  mimeType: string,
  title?: string,
  description?: string,
  isVirtual?: boolean
): Promise<ProductModerationResult> {
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType || 'image/jpeg',
    },
  };

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  let lastError: unknown;
  let allRateLimited = true;

  for (const modelName of modelsToTry) {
    try {
      const text = await callGeminiVision(modelName, imagePart, title, description, isVirtual);
      if (!text) {
        lastError = new Error('Empty moderation response from Gemini');
        allRateLimited = false;
        continue;
      }
      return parseModerationResponse(text, isVirtual, title, description);
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!errMsg.includes('429') && !errMsg.includes('Too Many Requests') && !errMsg.includes('quota')) {
        allRateLimited = false;
      }
      console.warn(
        `[product-moderation] ${modelName} failed:`,
        err
      );
      // Wait 1 second before trying the fallback model to allow API quota to breathe
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[product-moderation] All models failed:', lastError);

  // Fallback: if ALL models were rate-limited (429), perform a local-only safety check.
  // This allows legitimate craft uploads to proceed when the API quota is exhausted,
  // while still blocking obviously vulgar/inappropriate content via text scanning.
  if (allRateLimited) {
    console.warn('[product-moderation] All models rate-limited — falling back to local keyword safety check.');

    // Reject if title or description contain vulgar text
    if ((title && scanTextForVulgarity(title)) || (description && scanTextForVulgarity(description))) {
      return vulgarDetectedResult('Inappropriate text detected in product listing.');
    }

    // Build a local-approved result
    const localResult: ProductModerationResult = {
      approved: true,
      confidence: 60,
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
      reason: 'Approved via local safety check (API quota exceeded).',
    };

    // Double-check with isModerationApproved
    if (!isModerationApproved(localResult, isVirtual, title, description)) {
      localResult.approved = false;
      localResult.reason = 'Content did not pass local safety rules.';
    }

    return localResult;
  }

  throw lastError instanceof Error ? lastError : new Error('Moderation service unavailable');
}

/** Fetch a remote image URL and return base64 + mime type for moderation. */
export async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, mimeType };
}
