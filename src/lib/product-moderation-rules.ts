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

/** Profanity / vulgar terms — backup scan on AI response text or listing fields */
const VULGAR_PATTERN =
  /\b(fuck|fucking|fucker|shit|bullshit|bitch|asshole|bastard|dick|pussy|cock|whore|slut|cunt|porn|xxx|nude|naked|sex|dildo|vibrator|sex toy|sex toys|hentai|erotic|nigger|faggot|retard)\b/i;

/**
 * Allow upload ONLY IF:
 * approved = true
 * AND handmade_product = true
 * AND marketplace_safe = true
 * AND ALL safety flags below are false.
 */
export function isModerationApproved(result: ProductModerationResult, isVirtual?: boolean): boolean {
  const isSafe =
    result.approved === true &&
    result.marketplace_safe === true &&
    result.contains_nudity === false &&
    result.contains_sexual_content === false &&
    result.contains_sex_toys === false &&
    result.contains_profanity === false &&
    result.contains_hate_speech === false &&
    result.contains_violence === false &&
    result.contains_gore === false &&
    result.contains_weapons === false &&
    result.contains_drugs === false &&
    result.contains_extremism === false &&
    result.contains_spam === false &&
    result.contains_deceptive_content === false;

  if (!isSafe) {
    return false;
  }

  if (isVirtual === true) {
    // Virtual products must be recipes, artisan techniques, pottery, or clothes patterns/guides
    const allowedKeywords = [
      'recipe',
      'cook',
      'culinary',
      'artisan',
      'technique',
      'pottery',
      'clay',
      'craft',
      'tutorial',
      'guide',
      'pattern',
      'clothes',
      'design',
      'sew',
      'paint',
      'art'
    ];
    const category = (result.category || '').toLowerCase();
    const reason = (result.reason || '').toLowerCase();
    
    return allowedKeywords.some(keyword => category.includes(keyword) || reason.includes(keyword));
  }

  return result.handmade_product === true;
}

/** Backup: scan raw AI output for profanity mentions (e.g. in reason field) */
export function scanTextForVulgarity(text: string): boolean {
  return VULGAR_PATTERN.test(text);
}
