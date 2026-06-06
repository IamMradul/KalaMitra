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

Determine whether this listing is appropriate for a handmade crafts marketplace.

Evaluate:
1. Is the image genuinely showing a handmade product?
2. Is it related to crafts, pottery, paintings, artisan work, handmade decor, handmade jewelry, or similar handmade goods?
3. Does the image contain adult, sexual, vulgar, offensive, violent, hateful, deceptive, illegal, or unrelated content?
4. Does the title contain profanity, abuse, sexual references, hate speech, or spam?
5. Does the description contain profanity, abuse, sexual references, hate speech, scams, spam, or inappropriate intent?
6. Is there any attempt to bypass marketplace rules?

Return ONLY valid JSON.

{
"approved": true,
"confidence": 95,
"category": "pottery",
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
"reason": "Suitable handmade pottery product."
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

function parseModerationResponse(raw: string, isVirtual?: boolean): ProductModerationResult {
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
  const vulgarInText =
    scanTextForVulgarity(reason) ||
    scanTextForVulgarity(raw);

  const result: ProductModerationResult = {
    approved: vulgarInText ? false : Boolean(parsed.approved),
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, parsed.confidence))
        : vulgarInText ? 95 : 0,
    category: typeof parsed.category === 'string' ? parsed.category : 'other',
    handmade_product: Boolean(parsed.handmade_product),
    contains_nudity: Boolean(parsed.contains_nudity) || raw.toLowerCase().includes('nude') || raw.toLowerCase().includes('naked'),
    contains_sexual_content: Boolean(parsed.contains_sexual_content) || raw.toLowerCase().includes('sex'),
    contains_sex_toys: Boolean(parsed.contains_sex_toys) || raw.toLowerCase().includes('toy') || raw.toLowerCase().includes('dildo') || raw.toLowerCase().includes('vibrator'),
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

  // Double check that we reject sex toys
  if (result.contains_sex_toys || result.contains_sexual_content || result.contains_nudity) {
    result.approved = false;
    result.marketplace_safe = false;
  }

  if (!isModerationApproved(result, isVirtual)) {
    result.approved = false;
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
      `This is a virtual or digital product. The marketplace ONLY allows virtual products that are recipes, artisan techniques, pottery guides/tutorials, clothes patterns, or DIY creative guides.\n` +
      `- Because it is a digital/virtual product, the image does NOT need to show a physical handmade item. It can show text, graphics, a PDF cover page, or a food/recipe photo.\n` +
      `- Set "handmade_product" to true for this virtual product if it is a recipe, artisan technique, pottery guide, clothes pattern, or DIY creative guide.\n` +
      `- You MUST reject ("approved": false) any other virtual product categories or unrelated digital content (e.g. business/marketing guides, generic ebooks, software, templates unrelated to crafts/cooking).\n` +
      `- You MUST reject ("approved": false) anything that is inappropriate, vulgar, profane, sexual, offensive, violent, or hateful. Nudity, violence, drugs, weapons, or hate speech are strictly prohibited.`;
  } else {
    prompt += `\n\n**CRITICAL SAFETY REQUIREMENT**:\n` +
      `- You MUST strictly reject ("approved": false) any adult content, sex toys (like vibrators, dildos, etc.), nudity, vulgarity, violence, gore, weapons, or illicit drugs.\n` +
      `- Set "contains_sex_toys" and "contains_sexual_content" to true if the product is a sex toy or contains adult/erotic imagery.`;
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

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const text = await callGeminiVision(modelName, imagePart, title, description, isVirtual);
      if (!text) {
        lastError = new Error('Empty moderation response from Gemini');
        continue;
      }
      return parseModerationResponse(text, isVirtual);
    } catch (err) {
      lastError = err;
      console.warn(
        `[product-moderation] ${modelName} failed:`,
        err
      );
      // Wait 1 second before trying the fallback model to allow API quota to breathe
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[product-moderation] All models failed:', lastError);
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
