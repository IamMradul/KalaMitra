/**
 * Parse natural language queries for product search
 */

export interface ParsedQuery {
  keywords: string[];
  maxPrice: number | null;
  minPrice: number | null;
  categories: string[];
  occasion: string | null;
  sortBy: 'price' | 'relevance' | 'newest';
  intent: 'search' | 'recommendation' | 'comparison';
}

export function parseQuery(query: string): ParsedQuery {
  const lower = query.toLowerCase();
  
  // Extract price range
  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  
  // Match "under X", "below X", "less than X"
  const underMatch = lower.match(/(?:under|below|less than|max|maximum|cheaper than|lower than)\s+(?:rs\.?|₹)?\s*(\d+)/);
  if (underMatch) {
    maxPrice = parseInt(underMatch[1]);
  }
  
  // Match "above X", "over X", "more than X", "higher than X"
  const aboveMatch = lower.match(/(?:above|over|more than|higher than|greater than|min|minimum|expensive than)\s+(?:rs\.?|₹)?\s*(\d+)/);
  if (aboveMatch) {
    minPrice = parseInt(aboveMatch[1]);
  }
  
  // Match "price higher than X" or "price above X"
  const priceHigherMatch = lower.match(/price\s+(?:higher|above|more|greater)\s+(?:than\s+)?(?:rs\.?|₹)?\s*(\d+)/);
  if (priceHigherMatch) {
    minPrice = parseInt(priceHigherMatch[1]);
  }
  
  // Match "price lower than X" or "price below X"
  const priceLowerMatch = lower.match(/price\s+(?:lower|below|less|under)\s+(?:than\s+)?(?:rs\.?|₹)?\s*(\d+)/);
  if (priceLowerMatch) {
    maxPrice = parseInt(priceLowerMatch[1]);
  }
  
  // Match "between X and Y"
  const betweenMatch = lower.match(/between\s+(?:rs\.?|₹)?\s*(\d+)\s+(?:and|to|-)\s+(?:rs\.?|₹)?\s*(\d+)/);
  if (betweenMatch) {
    minPrice = parseInt(betweenMatch[1]);
    maxPrice = parseInt(betweenMatch[2]);
  }
  
  // Extract keywords (filter out common words)
  const stopWords = new Set(['show', 'me', 'find', 'get', 'want', 'need', 'looking', 'for', 'a', 'an', 'the', 'is', 'are', 'under', 'below', 'above', 'between', 'and', 'or', 'with', 'without', 'rs', 'rupees', 'inr', 'price', 'than', 'higher', 'lower']);
  const words = lower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const keywords = [...new Set(words)];
  
  // Detect occasions
  const occasions: Record<string, string[]> = {
    'diwali': ['diwali', 'deepavali', 'festival of lights'],
    'wedding': ['wedding', 'marriage', 'shaadi'],
    'birthday': ['birthday', 'bday'],
    'housewarming': ['housewarming', 'griha pravesh', 'new home'],
    'anniversary': ['anniversary'],
    'rakhi': ['rakhi', 'raksha bandhan'],
    'holi': ['holi'],
  };
  
  let occasion: string | null = null;
  for (const [key, values] of Object.entries(occasions)) {
    if (values.some(v => lower.includes(v))) {
      occasion = key;
      break;
    }
  }
  
  // Detect categories
  const categoryKeywords: Record<string, string[]> = {
    'decoration': ['decoration', 'decor', 'decorative'],
    'handicraft': ['handicraft', 'handmade', 'artisan', 'craft'],
    'painting': ['painting', 'art', 'canvas'],
    'jewelry': ['jewelry', 'jewellery', 'ornament'],
    'pottery': ['pottery', 'ceramic', 'clay'],
    'textile': ['textile', 'fabric', 'cloth', 'saree', 'dupatta'],
    'sculpture': ['sculpture', 'statue', 'idol'],
    'gift': ['gift', 'present'],
  };
  
  const categories: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      categories.push(category);
    }
  }
  
  // Detect sort preference
  let sortBy: 'price' | 'relevance' | 'newest' = 'relevance';
  if (lower.includes('cheap') || lower.includes('affordable') || lower.includes('budget')) {
    sortBy = 'price';
  } else if (lower.includes('new') || lower.includes('latest') || lower.includes('recent')) {
    sortBy = 'newest';
  }
  
  // Detect intent
  let intent: 'search' | 'recommendation' | 'comparison' = 'search';
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('best')) {
    intent = 'recommendation';
  } else if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs')) {
    intent = 'comparison';
  }
  
  return {
    keywords,
    maxPrice,
    minPrice,
    categories,
    occasion,
    sortBy,
    intent,
  };
}

/**
 * Generate a friendly response for parsed query
 */
export function generateResponse(parsed: ParsedQuery, productCount: number): string {
  const parts: string[] = [];
  
  if (productCount === 0) {
    return "I couldn't find any products matching your criteria. Try adjusting your search or removing some filters!";
  }
  
  parts.push(`I found ${productCount} ${productCount === 1 ? 'product' : 'products'}`);
  
  if (parsed.occasion) {
    parts.push(`perfect for ${parsed.occasion}`);
  }
  
  if (parsed.categories.length > 0) {
    parts.push(`in ${parsed.categories.join(' & ')}`);
  }
  
  if (parsed.maxPrice && parsed.minPrice) {
    parts.push(`between ₹${parsed.minPrice} - ₹${parsed.maxPrice}`);
  } else if (parsed.maxPrice) {
    parts.push(`under ₹${parsed.maxPrice}`);
  } else if (parsed.minPrice) {
    parts.push(`above ₹${parsed.minPrice}`);
  }
  
  return parts.join(' ') + '. Here are the top results:';
}
