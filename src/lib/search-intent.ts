import Fuse from 'fuse.js';

export const popularKeywords = [
  // Art & Decor
  "handmade", "terracotta", "pottery", "decor", "wall art", "clay pot", "vase", "sculpture", "painting", "handicraft", 
  "wall hanging", "showpiece", "lamp", "lantern", "candle", "cushion cover", "rug", "carpet", "macrame", "dream catcher",
  "mandala", "canvas", "resin art", "lippan art", "warli painting", "madhubani", "pichwai", "tanjore",
  
  // Clothing & Textiles
  "saree", "kurti", "lehenga", "dupatta", "shawl", "stole", "scarf", "dress", "suit", "ethnic wear", "cotton", "silk",
  
  // Jewelry & Accessories
  "jewelry", "jewellery", "earrings", "necklace", "bangles", "bracelet", "ring", "anklet", "jhumka", "oxidised", 
  "tote bag", "sling bag", "clutch", "potli", "wallet", "jute bag",
  
  // Kitchen & Dining
  "ceramic bowl", "mug", "tea cup", "saucer", "plates", "wooden tray", "coaster", "kulhad", "copper bottle",
  
  // Food & Snacks
  "snack", "cookies", "biscuit", "namkeen", "khakhra", "bhujia", "mathri", "chocolates", "dry fruits", "sweets", "mithai", "pickles", "achar", "papad",
  
  // Festival & Pooja
  "gifts", "gift", "diya", "incense", "agarbatti", "dhoop", "pooja thali", "idol", "murti", "toran", "rangoli",
  
  // Wellness & Beauty
  "handmade soap", "essential oil", "scrub", "lotion", "lip balm", "perfume", "attar", "organic"
];

// Initialize global fuzzy matcher for backend intent correction
const fuseMatcher = new Fuse(popularKeywords.map(w => ({ word: w })), {
  keys: ['word'],
  includeScore: true,
  threshold: 0.5 // Forgives minor typos like "sarii" -> "saree" (score: 0.4)
});

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
  
  // Cross-lingual / Conceptual Synonyms (Expansions, NOT typos)
  'handmade': ['handcrafted', 'artisanal'],
  'diya': ['oil lamp', 'deepak', 'pooja diya'],
  'vase': ['flower pot', 'planter'],
  'clay pot': ['earthen pot', 'matka'],
};

export const synonymMap: Record<string, string> = {
  'handmde': 'handmade',
  'potry': 'pottery',
  'terracota': 'terracotta',
  'biskut': 'biscuit',
  'sarii': 'saree',
  'saari': 'saree'
};

/**
 * Analyzes the search query to expand vague intent and correct common synonyms.
 * @param query The raw user query
 * @returns { original: string, corrected: string, expansion: string[] }
 */
export function analyzeQuery(query: string) {
  const normalized = query.toLowerCase().trim();
  let corrected = normalized;

  // 0. Dynamic Fuzzy Expansion via Fuse.js
  let fuzzyMatch = null;
  if (normalized.length > 3) {
    const fuzzyRes = fuseMatcher.search(normalized);
    if (fuzzyRes.length > 0 && fuzzyRes[0].score !== undefined && fuzzyRes[0].score <= 0.45) {
      fuzzyMatch = fuzzyRes[0].item.word;
    }
  }

  // 1. Exact Typo Replacement (Word boundary match)
  for (const [key, value] of Object.entries(synonymMap)) {
    if (corrected.includes(key)) {
      corrected = corrected.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
    }
  }

  // 2. Intent Expansion
  let expansion: string[] = [];
  if (fuzzyMatch && fuzzyMatch !== corrected) {
    expansion.push(fuzzyMatch);
  }

  for (const [intent, categories] of Object.entries(intentCategoryMap)) {
    if (corrected.includes(intent) || (fuzzyMatch && fuzzyMatch.includes(intent))) {
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
