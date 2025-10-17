import { NextResponse } from 'next/server';
import { supabase, Database } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embedding-service';
import { parseQuery } from '@/lib/chat-parser';
import { generateRAGResponse, generateTemplateResponse, GenerationContext } from '@/lib/llm-generator';
import { v4 as uuidv4 } from 'uuid';

type Product = Database['public']['Tables']['products']['Row'];

interface ConversationMessage {
  role: 'user' | 'assistant';
  message: string;
}

export async function POST(req: Request) {
  try {
    const { query, userId, sessionId: clientSessionId, conversationHistory } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Generate or use session ID
    const sessionId = clientSessionId || uuidv4();

    console.log('AI Chat query:', query);
    console.log('Conversation history length:', conversationHistory?.length || 0);

    // Parse the query
    const parsed = parseQuery(query);
    console.log('Parsed query:', parsed);

    // Smart follow-up detection: If query has no meaningful content (no categories, no product mentions)
    // but has filters (price) or follow-up keywords, it's likely a follow-up to previous query
    const followUpKeywords = [
      'cheaper', 'expensive', 'similar', 'other', 'more', 'different',
      'show me', 'another', 'else', 'instead', 'rather', 'better',
      'less', 'higher', 'lower', 'bigger', 'smaller', 'larger',
      'above', 'below', 'under', 'over'
    ];
    
    // Check query content
    const hasFollowUpKeyword = followUpKeywords.some(keyword => query.toLowerCase().includes(keyword));
    const meaningfulKeywords = parsed.keywords.filter(k => !k.match(/^\d+\??$/));
    const hasFilters = parsed.minPrice !== null || parsed.maxPrice !== null;
    
    // A query is a follow-up if:
    // 1. Has follow-up keywords OR
    // 2. Has filters (price) but no meaningful content (categories/keywords) - just applying filters
    const lacksContent = meaningfulKeywords.length === 0 && parsed.categories.length === 0 && !parsed.occasion;
    const isFilterOnly = hasFilters && lacksContent;
    
    const isFollowUp = conversationHistory && conversationHistory.length > 0 && 
      (hasFollowUpKeyword || isFilterOnly);

    // Extract context from previous messages for follow-ups
    let previousQuery: string | undefined = undefined;
    let previousParsed = undefined;
    if (isFollowUp && conversationHistory.length > 0) {
      // Get the last meaningful user message (not just price queries)
      const userMessages = conversationHistory
        .slice()
        .reverse()
        .filter((m: ConversationMessage) => m.role === 'user');
      
      // Find the last message with meaningful content (not just numbers/price)
      for (const msg of userMessages) {
        const testParsed = parseQuery(msg.message);
        const meaningfulKeywords = testParsed.keywords.filter(k => !k.match(/^\d+\??$/));
        
        if (meaningfulKeywords.length > 0 || testParsed.categories.length > 0 || testParsed.occasion) {
          previousQuery = msg.message;
          previousParsed = testParsed;
          break;
        }
      }
      
      if (previousQuery && previousParsed) {
        console.log('Follow-up detected, previous meaningful query:', previousQuery);
        console.log('Previous parsed:', previousParsed);
        
        // Inherit context from previous query if current query is vague
        if (!parsed.categories.length && previousParsed.categories.length) {
          parsed.categories = previousParsed.categories;
          console.log('Inherited categories from previous query:', parsed.categories);
        }
        if (!parsed.occasion && previousParsed.occasion) {
          parsed.occasion = previousParsed.occasion;
          console.log('Inherited occasion from previous query:', parsed.occasion);
        }
        
        // If current query has no meaningful keywords (just price), inherit from previous
        const meaningfulKeywords = parsed.keywords.filter(k => !k.match(/^\d+\??$/));
        if (meaningfulKeywords.length === 0 && previousParsed.keywords.length > 0) {
          // Inherit the semantic context by using previous query for embedding
          console.log('Current query is just price adjustment, will use previous context for search');
          // We'll use the previous query's keywords to maintain context
          parsed.keywords = previousParsed.keywords;
        }
        
        // Handle price adjustments for follow-ups
        if (query.toLowerCase().includes('higher') || query.toLowerCase().includes('expensive')) {
          // If previous had maxPrice, use it as minPrice
          if (previousParsed.maxPrice) {
            parsed.minPrice = previousParsed.maxPrice;
            parsed.maxPrice = null;
            console.log('Adjusted price: above', parsed.minPrice);
          }
        } else if (query.toLowerCase().includes('cheaper') || query.toLowerCase().includes('lower')) {
          // If previous had minPrice, use it as maxPrice
          if (previousParsed.minPrice) {
            parsed.maxPrice = previousParsed.minPrice;
            parsed.minPrice = null;
            console.log('Adjusted price: below', parsed.maxPrice);
          } else if (previousParsed.maxPrice) {
            // Or reduce the maxPrice
            parsed.maxPrice = Math.floor(previousParsed.maxPrice * 0.7);
            console.log('Adjusted price: below', parsed.maxPrice);
          }
        }
      }
    }

    // Get user preferences if logged in
    let userPreferences = null;
    if (userId) {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('favorite_categories, common_search_terms')
        .eq('user_id', userId)
        .single();
      
      userPreferences = prefs;
    }

    // Generate embedding for semantic search
    // For follow-ups with just price adjustments, use previous query's context
    let searchQuery = query;
    if (isFollowUp && previousQuery) {
      const meaningfulKeywords = parsed.keywords.filter(k => !k.match(/^\d+\??$/));
      if (meaningfulKeywords.length === 0) {
        // Query is just a price filter, use previous query for semantic search
        searchQuery = previousQuery;
        console.log('Using previous query for embedding:', searchQuery);
      }
    }
    
    const queryEmbedding = await generateEmbedding(searchQuery);

    // Search with semantic similarity
    // For price-only follow-ups, we need more results since we'll filter by price
    const matchCount = (isFollowUp && searchQuery !== query) ? 100 : 50;
    console.log('Searching with match_count:', matchCount);
    
    const { data: semanticResults, error: semanticError } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: matchCount,
    });

    if (semanticError) {
      console.error('Error in semantic search:', semanticError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    let results = semanticResults || [];
    console.log('Semantic results count:', results.length);

    // Keep original results before price filtering (for fallback)
    const resultsBeforeFiltering = [...results];

    // Apply price filters (these are explicit and should be applied)
    if (parsed.minPrice !== null) {
      results = results.filter((p: Product) => p.price >= parsed.minPrice!);
      console.log('After minPrice filter:', results.length);
    }
    if (parsed.maxPrice !== null) {
      results = results.filter((p: Product) => p.price <= parsed.maxPrice!);
      console.log('After maxPrice filter:', results.length);
    }

    // Fallback: If price filter removed all results but we had results before, use original
    if (results.length === 0 && resultsBeforeFiltering.length > 0 && 
        (parsed.minPrice !== null || parsed.maxPrice !== null)) {
      console.log('Price filter removed all results, using original results as fallback');
      results = resultsBeforeFiltering;
      // Update context to indicate price range not available
      parsed.minPrice = null;
      parsed.maxPrice = null;
    }

    // Skip category filtering for AI chat - semantic search handles relevance better
    // Categories are kept in parsed query for response generation only

    // Sort results
    if (parsed.sortBy === 'price') {
      results.sort((a: Product, b: Product) => a.price - b.price);
    } else if (parsed.sortBy === 'newest') {
      results.sort((a: Product, b: Product) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    // 'relevance' is already sorted by similarity from the database

    // Limit to top results
    const topResults = results.slice(0, 12);

    // Build context for response generation
    const context: GenerationContext = {
      query,
      productCount: topResults.length,
      categories: parsed.categories,
      occasion: parsed.occasion,
      priceRange: {
        min: parsed.minPrice || undefined,
        max: parsed.maxPrice || undefined,
      },
      userPreferences: userPreferences ? {
        favoriteCategories: userPreferences.favorite_categories,
        recentSearches: userPreferences.common_search_terms?.map((t: { term: string }) => t.term),
      } : undefined,
      isFollowUp,
      previousQuery, // Use the extracted previous query
    };

    // Generate response using RAG-based search with template responses
    // RAG is used for semantic product retrieval (embeddings + vector search)
    // Templates are used for response generation (fast, reliable, high-quality)
    let responseText: string;
    try {
      console.log('Generating response with RAG search + templates...');
      responseText = await generateRAGResponse(context, topResults);
      console.log('Response generated successfully');
    } catch (error) {
      console.error('Response generation error:', error);
      // Extra fallback to template-based response
      responseText = generateTemplateResponse(context);
    }

    // Store conversation history ONLY for logged-in users
    if (userId) {
      try {
        await supabase.from('conversation_history').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          message: query,
          query_context: {
            parsed,
            productCount: topResults.length,
          },
        });

        // Store assistant response
        await supabase.from('conversation_history').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          message: responseText,
          query_context: {
            productIds: topResults.slice(0, 3).map((p: Product) => p.id),
            productCount: topResults.length,
          },
        });
        
        console.log('Conversation stored for user:', userId);
      } catch (dbError) {
        console.error('Error storing conversation:', dbError);
        // Don't fail the request if storage fails
      }
    } else {
      console.log('Anonymous user - conversation not stored');
    }

    return NextResponse.json({
      message: responseText,
      products: topResults,
      parsed: parsed,
      count: topResults.length,
      sessionId, // Return session ID for client to track
    });

  } catch (e) {
    console.error('AI Chat error:', e);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      message: "Sorry, I encountered an error. Please try again!"
    }, { status: 500 });
  }
}
