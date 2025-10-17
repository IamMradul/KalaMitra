/**
 * RAG-based search with template response generation
 * Uses RAG (Retrieval-Augmented Generation) for semantic product search
 * Generates responses using high-quality templates for reliability
 * 
 * Architecture:
 * - Retrieval: Vector embeddings + semantic search (RAG component)
 * - Response: Template-based generation (fast and reliable)
 */

import { pipeline, TextGenerationPipeline } from '@xenova/transformers';

// Singleton pattern for model caching
let generatorInstance: TextGenerationPipeline | null = null;
let isLoading = false;
let loadPromise: Promise<TextGenerationPipeline> | null = null;

/**
 * Initialize the text generation model
 * Uses a small, fast model suitable for product recommendations
 */
async function initializeGenerator(): Promise<TextGenerationPipeline> {
  if (generatorInstance) {
    return generatorInstance;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  console.log('Initializing LLM generator for the first time...');

  loadPromise = pipeline('text-generation', 'Xenova/distilgpt2', {
    // Use smaller model for faster inference
    quantized: true,
  }) as Promise<TextGenerationPipeline>;

  try {
    generatorInstance = await loadPromise;
    console.log('LLM generator initialized successfully');
    return generatorInstance;
  } catch (error) {
    console.error('Error initializing LLM generator:', error);
    throw error;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
}

export interface GenerationContext {
  query: string;
  productCount: number;
  categories?: string[];
  occasion?: string | null;
  priceRange?: { min?: number; max?: number };
  userPreferences?: {
    favoriteCategories?: Array<{ category: string; count: number }>;
    recentSearches?: string[];
  };
  isFollowUp?: boolean;
  previousQuery?: string;
}

/**
 * Generate a natural language response using local LLM
 * Falls back to templates if LLM fails
 */
export async function generateLLMResponse(context: GenerationContext): Promise<string> {
  try {
    const generator = await initializeGenerator();
    
    // Create a prompt for the LLM
    const prompt = buildPrompt(context);
    
    // Generate response (limited tokens for speed)
    const result = await generator(prompt, {
      max_new_tokens: 40,
      temperature: 0.8,
      do_sample: true,
      top_k: 50,
      top_p: 0.9,
      pad_token_id: 50256,
    });

    // Extract generated text - handle different response formats
    let generated = '';
    if (Array.isArray(result)) {
      // Array format: result is an array of generation objects
      const firstResult = result[0];
      if (firstResult && typeof firstResult === 'object' && 'generated_text' in firstResult) {
        generated = (firstResult as { generated_text: string }).generated_text;
      }
    } else if (result && typeof result === 'object' && 'generated_text' in result) {
      // Single object format
      generated = (result as { generated_text: string }).generated_text;
    }

    if (!generated) {
      console.log('Could not extract generated text, using template');
      return generateTemplateResponse(context);
    }
    
    // Clean up the response (remove prompt, clean formatting)
    const cleanResponse = cleanGeneratedText(generated, prompt);
    
    // Validate response quality
    if (cleanResponse.length < 10 || cleanResponse.length > 200) {
      console.log('LLM response quality check failed, using template');
      return generateTemplateResponse(context);
    }

    return cleanResponse;
  } catch (error) {
    console.error('LLM generation error:', error);
    // Fallback to template-based response
    return generateTemplateResponse(context);
  }
}

/**
 * RAG-based search with template responses
 * Uses RAG for semantic search (retrieval) but generates responses using templates
 * This provides fast, reliable responses while keeping intelligent product discovery
 * 
 * @param context - Generation context
 * @param _products - Array of retrieved products (from RAG search, not used in template generation)
 * @returns Promise<string> - Generated response using templates
 */
export async function generateRAGResponse(
  context: GenerationContext, 
  _products: Array<{ id: string; title: string; description: string; price: number; category: string }>
): Promise<string> {
  // RAG is used for search (semantic retrieval with embeddings)
  // But we use templates for response generation for better quality and speed
  console.log('Using RAG-based search with template response generation');
  
  // Generate response using high-quality templates
  // Products are already retrieved using RAG semantic search
  return generateTemplateResponse(context);
}

/**
 * Build a RAG prompt with product context
 */
function buildRAGPrompt(context: GenerationContext, productContext: string): string {
  const { query, productCount } = context;
  
  let prompt = 'You are a helpful shopping assistant for an artisan marketplace.\n\n';
  prompt += `Available products:\n${productContext}\n\n`;
  prompt += `User asked: "${query}"\n`;
  prompt += `Found ${productCount} products.\n\n`;
  prompt += 'Respond naturally and helpfully (1-2 sentences):\n';
  
  return prompt;
}

/**
 * Build a prompt for the LLM based on context
 */
function buildPrompt(context: GenerationContext): string {
  const { query, productCount, occasion, categories, priceRange, userPreferences, isFollowUp } = context;
  
  let prompt = 'Assistant helping with artisan marketplace.\n';
  
  if (userPreferences?.favoriteCategories && userPreferences.favoriteCategories.length > 0) {
    const topCat = userPreferences.favoriteCategories[0].category;
    prompt += `User likes: ${topCat}.\n`;
  }
  
  prompt += `User asks: "${query}"\n`;
  
  if (isFollowUp) {
    prompt += 'This is a follow-up question.\n';
  }
  
  prompt += `Found ${productCount} products`;
  
  if (occasion) {
    prompt += ` for ${occasion}`;
  }
  
  if (priceRange?.max) {
    prompt += ` under ₹${priceRange.max}`;
  }
  
  prompt += '.\nResponse: ';
  
  return prompt;
}

/**
 * Clean generated text by removing prompt and fixing formatting
 */
function cleanGeneratedText(generated: string, prompt: string): string {
  // Remove the prompt from the generated text
  let cleaned = generated.replace(prompt, '').trim();
  
  // Take only the first sentence or two
  const sentences = cleaned.split(/[.!?]+/);
  cleaned = sentences.slice(0, 2).join('. ').trim();
  
  if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.';
  }
  
  // Remove incomplete sentences or weird artifacts
  if (cleaned.length < 10) {
    return '';
  }
  
  return cleaned;
}

/**
 * Template-based response generator
 * Generates high-quality, reliable responses using templates
 * Used with RAG-based semantic search for optimal results
 */
export function generateTemplateResponse(context: GenerationContext): string {
  const { productCount, occasion, categories, priceRange, userPreferences, isFollowUp } = context;
  
  if (productCount === 0) {
    return getNoResultsMessage(context);
  }
  
  // Build response parts
  const parts: string[] = [];
  
  // Opening
  if (isFollowUp) {
    parts.push(getFollowUpOpening());
  } else if (userPreferences?.favoriteCategories && userPreferences.favoriteCategories.length > 0) {
    parts.push(getPersonalizedOpening(userPreferences.favoriteCategories[0].category));
  } else {
    parts.push(getRandomOpening());
  }
  
  // Main message
  parts.push(getMainMessage(productCount, occasion, categories, priceRange));
  
  // Closing
  parts.push(getRandomClosing());
  
  return parts.join(' ');
}

function getRandomOpening(): string {
  const openings = [
    "Great choice!",
    "Perfect!",
    "Wonderful!",
    "Excellent!",
    "I'm happy to help!",
    "Let me show you what I found!",
    "Here's what I discovered!",
  ];
  return openings[Math.floor(Math.random() * openings.length)];
}

function getPersonalizedOpening(favoriteCategory: string): string {
  const openings = [
    `Since you love ${favoriteCategory}, you'll appreciate this!`,
    `Based on your interest in ${favoriteCategory}, I found something special!`,
    `Perfect for a ${favoriteCategory} enthusiast like you!`,
  ];
  return openings[Math.floor(Math.random() * openings.length)];
}

function getFollowUpOpening(): string {
  const openings = [
    "Sure thing!",
    "Absolutely!",
    "Here you go!",
    "Of course!",
    "Let me refine that for you!",
  ];
  return openings[Math.floor(Math.random() * openings.length)];
}

function getMainMessage(
  count: number,
  occasion?: string | null,
  categories?: string[],
  priceRange?: { min?: number; max?: number }
): string {
  let msg = `I found ${count} ${count === 1 ? 'beautiful piece' : 'amazing products'}`;
  
  if (occasion) {
    const occasionPhrases = [
      `perfect for ${occasion}`,
      `ideal for celebrating ${occasion}`,
      `great for ${occasion} gifting`,
    ];
    msg += ' ' + occasionPhrases[Math.floor(Math.random() * occasionPhrases.length)];
  }
  
  if (categories && categories.length > 0 && categories[0] !== 'gift') {
    msg += ` in ${categories.join(' & ')}`;
  }
  
  if (priceRange?.max && priceRange?.min) {
    msg += ` between ₹${priceRange.min}-₹${priceRange.max}`;
  } else if (priceRange?.max) {
    msg += ` under ₹${priceRange.max}`;
  } else if (priceRange?.min) {
    msg += ` starting from ₹${priceRange.min}`;
  }
  
  return msg + '.';
}

function getRandomClosing(): string {
  const closings = [
    "Here are my top picks for you:",
    "Check out these handcrafted beauties:",
    "Take a look at these:",
    "Here's what caught my eye:",
    "These might be perfect:",
  ];
  return closings[Math.floor(Math.random() * closings.length)];
}

function getNoResultsMessage(context: GenerationContext): string {
  const messages = [
    "I couldn't find exact matches, but let me try a broader search for you!",
    "Hmm, those filters might be too specific. Try removing some criteria?",
    "No exact matches yet, but our artisans add new items daily. Check back soon!",
    "Let's try adjusting your search. Maybe increase the price range or try different keywords?",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
