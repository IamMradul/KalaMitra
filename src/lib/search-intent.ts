export const intentCategoryMap: Record<string, string[]> = {
  'gift': ['handmade gifts', 'pottery', 'decor', 'crafts', 'jewellery'],
  'gifts': ['handmade gifts', 'pottery', 'decor', 'crafts', 'jewellery'],
  'gift for mother': ['handmade gifts', 'decorative items', 'pottery gifts', 'saree', 'jewelry'],
  'home decor': ['wall art', 'terracotta items', 'decorative products', 'sculptures'],
  'home decoration': ['wall art', 'terracotta items', 'decorative products', 'sculptures'],
  'rustic home decor': ['terracotta decor', 'wall art', 'clay crafts'],
  'village decor': ['clay pots', 'terracotta vases', 'handmade decor', 'rustic decor'],
  'festival': ['diyas', 'decorations', 'gifting items', 'puja items'],
  'snack': ['cookies', 'chips', 'namkeen', 'snacks'],
  'snacks': ['cookies', 'chips', 'namkeen', 'snacks'],
  'snack for evening': ['cookies', 'chips', 'namkeen', 'snacks'],
  'cold drink': ['soda', 'coke', 'pepsi', 'juice'],
};

export const synonymMap: Record<string, string> = {
  'clay pot': 'earthen pot',
  'diya': 'oil lamp',
  'vase': 'flower pot',
  'handmade': 'handcrafted',
  'handmde': 'handmade',
  'potry': 'pottery',
  'terracota': 'terracotta',
  'biskut': 'biscuit'
};

/**
 * Analyzes the search query to expand vague intent and correct common synonyms.
 * @param query The raw user query
 * @returns { original: string, corrected: string, expansion: string[] }
 */
export function analyzeQuery(query: string) {
  const normalized = query.toLowerCase().trim();
  let corrected = normalized;

  // 1. Exact Synonym Replacement (Word boundary match)
  for (const [key, value] of Object.entries(synonymMap)) {
    if (corrected.includes(key)) {
      corrected = corrected.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
    }
  }

  // 2. Intent Expansion
  let expansion: string[] = [];
  for (const [intent, categories] of Object.entries(intentCategoryMap)) {
    if (corrected.includes(intent)) {
      expansion = [...new Set([...expansion, ...categories])];
    }
  }

  return {
    original: query,
    corrected,
    expansion,
    isCorrected: corrected !== normalized,
  };
}
