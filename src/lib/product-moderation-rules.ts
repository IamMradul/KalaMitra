/**
 * Shared moderation approval rules (safe for client + server).
 */

export type ProductModerationCategory =
  | 'pottery'
  | 'painting'
  | 'handicraft'
  | 'decor'
  | 'other';

export interface ProductModerationResult {
  approved: boolean;
  confidence: number;
  category: string;
  handmade_product: boolean;
  contains_nudity: boolean;
  contains_sexual_content: boolean;
  contains_sex_toys: boolean;
  contains_profanity: boolean;
  contains_hate_speech: boolean;
  contains_violence: boolean;
  contains_gore: boolean;
  contains_weapons: boolean;
  contains_drugs: boolean;
  contains_extremism: boolean;
  contains_spam: boolean;
  contains_deceptive_content: boolean;
  marketplace_safe: boolean;
  reason: string;
}

/** Profanity / vulgar terms related to sex products / adult content */
const VULGAR_PATTERN =
  /\b(porn|pornography|xxx|dildo|vibrator|sex\s+toy|sex\s+toys|adult\s+toy|adult\s+toys|hentai|erotica|masturbator|masturbate)\b/i;

/**
 * Allow upload unless the product contains adult content, nudity, sexual content, or sex toys.
 */
export function isModerationApproved(
  result: ProductModerationResult,
  isVirtual?: boolean,
  title?: string,
  description?: string
): boolean {
  // MUST reject if any adult safety flags are true
  const isUnsafe =
    result.contains_nudity === true ||
    result.contains_sexual_content === true ||
    result.contains_sex_toys === true;

  return !isUnsafe;
}

/** Backup: scan raw AI output for profanity mentions (e.g. in reason field) */
export function scanTextForVulgarity(text: string): boolean {
  return VULGAR_PATTERN.test(text);
}
