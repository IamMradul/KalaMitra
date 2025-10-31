import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export interface AIAnalysisResult {
  title: string;
  description: string;
  pricingSuggestion: {
    minPrice: number;
    maxPrice: number;
    reasoning: string;
  };
  category: string;
  tags: string[];
  productType: 'vertical' | 'horizontal';
}

export interface SellerAnalyticsSnapshot {
  totalViews: number;
  uniqueVisitors: number;
  topProducts: { title: string; views: number }[];
}

export class AIService {
  /**
   * Analyze a PDF file as a virtual product and generate product description and pricing
   */
  async analyzeProductPdf(file: File, context: {
    title?: string;
    category?: string;
    description?: string;
    price?: string;
    virtualFileUrl?: string;
    isVirtual?: boolean;
  }): Promise<AIAnalysisResult> {
    try {
      // Convert PDF file to base64
      const base64Pdf = await this.fileToBase64(file);

      // Prepare the prompt for the AI
      const prompt = `
        Analyze this product as a virtual/digital copy (PDF) for sale. There is no physical product, only a digital PDF will be provided to the buyer.
        Return ONLY a JSON response with no additional text, markdown, or formatting.

        Product Details:
        Title: ${context.title || ''}
        Category: ${context.category || ''}
        Description: ${context.description || ''}
        Price: ${context.price || ''}
        Virtual PDF URL: ${context.virtualFileUrl || ''}

        Return exactly this JSON structure (all prices in INR - Indian Rupees, ₹):
        {
          "title": "unique descriptive title here",
          "description": "detailed description here",
          "pricingSuggestion": {
            "minPrice": 500,
            "maxPrice": 1500,
            "reasoning": "pricing reasoning here"
          },
          "category": "category name",
          "tags": ["tag1", "tag2", "tag3"],
          "productType": "vertical"
        }

        Requirements:
        1. A unique, descriptive product title (3-6 words) that captures:
           - The specific type/style of the item
           - Key features of the PDF (tutorial, recipe, template, etc.)
           - Cultural or regional elements if present
           - Avoid generic words like "Beautiful" or "Amazing"
           - Be specific and memorable

        2. A detailed, engaging product description (2-3 sentences) that highlights:
           - What the PDF contains (steps, instructions, templates, etc.)
           - Value for the buyer
           - Unique features

        3. A pricing suggestion in Indian Rupees (₹) with reasoning based on:
           - Content quality
           - Usefulness
           - Market value for similar digital products
           - Uniqueness

        4. Product category (e.g., Tutorial, Recipe, Template, Digital Art)

        5. Relevant tags for searchability

        6. Product type for AR placement:
           - "vertical" for items typically displayed vertically (tutorials, wall art, etc.)
           - "horizontal" for items typically displayed horizontally (floor art, templates, etc.)

        IMPORTANT:
        - Currency must be INR (₹) suitable for Indian online marketplace buyers
        - Use realistic rupee values (do not output dollars)
        - Return ONLY the JSON object, no markdown, no code blocks, no additional text.
        Focus on helping sellers understand the true value of their digital work and avoid underpricing.
      `;

      // Create the PDF part for the API
      const pdfPart = {
        inlineData: {
          data: base64Pdf,
          mimeType: file.type || 'application/pdf'
        }
      };

      // Generate content using Gemini
      const result = await this.model.generateContent([prompt, pdfPart]);
      const response_text = result.response.text();

      // Extract JSON from the response (AI might return markdown with code blocks)
      let jsonText = response_text;

      if (response_text.includes('```json')) {
        const jsonMatch = response_text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
      } else if (response_text.includes('```')) {
        const codeMatch = response_text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonText = codeMatch[1].trim();
        }
      }

      jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

      let aiResult;
      try {
        aiResult = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Raw response:', response_text);
        console.error('Extracted JSON text:', jsonText);
        throw new Error('AI response format is invalid. Please try again with a different PDF.');
      }

      if (!aiResult.title || !aiResult.description || !aiResult.pricingSuggestion || !aiResult.category || !aiResult.tags || !aiResult.productType) {
        console.error('Invalid AI response structure:', aiResult);
        throw new Error('AI response is incomplete. Please try again.');
      }

      return {
        title: aiResult.title,
        description: aiResult.description,
        pricingSuggestion: {
          minPrice: parseFloat(aiResult.pricingSuggestion.minPrice),
          maxPrice: parseFloat(aiResult.pricingSuggestion.maxPrice),
          reasoning: aiResult.pricingSuggestion.reasoning
        },
        category: aiResult.category,
        tags: aiResult.tags,
        productType: aiResult.productType
      };
    } catch (error) {
      console.error('AI PDF analysis failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze PDF. Please try again.');
    }
  }
  private static instance: AIService;
  private model: ReturnType<typeof genAI.getGenerativeModel>;

  private constructor() {
    const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate concise seller tips from analytics
   */
  async generateSellerTips(snapshot: SellerAnalyticsSnapshot): Promise<string> {
    const prompt = `You are a marketplace growth coach. Based on this 30-day snapshot, write 4-6 concise, actionable tips. Use short bullets with verbs. Avoid fluff.

Snapshot (JSON): ${JSON.stringify(snapshot)}

Return plain text with bullets. Keep under 1200 characters.`
    const result = await this.model.generateContent(prompt)
    return result.response.text().trim()
  }

  /**
   * Answer a seller's follow-up question using analytics context
   */
  async answerSellerQuestion(snapshot: SellerAnalyticsSnapshot, question: string): Promise<string> {
    const prompt = `Context:
${JSON.stringify(snapshot, null, 2)}

Question: ${question}

Answer as a pragmatic marketplace strategist. Give specific, short recommendations. Use bullets if helpful. Keep it under 800 characters.`
    const result = await this.model.generateContent(prompt)
    return result.response.text().trim()
  }

  /**
   * Generate a compelling store description for an artisan
   */
  async generateStoreDescription(sellerName: string, bio: string, products: { title: string; category: string }[]): Promise<string> {
    try {
      const prompt = `
        Create a compelling store description for an artisan marketplace stall. This should be engaging, authentic, and highlight the seller's unique story and craftsmanship.

        Seller Name: ${sellerName}
        Bio: ${bio || 'Passionate artisan'}
        Products: ${products.map(p => `${p.title} (${p.category})`).join(', ')}

        Requirements:
        - 2-3 sentences maximum
        - Highlight craftsmanship and cultural significance
        - Mention the types of products they create
        - Include a personal touch
        - Make it warm and inviting
        - Focus on quality and tradition

        Return only the description text, no additional formatting.
      `;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Store description generation failed:', error);
      throw new Error('Failed to generate store description. Please try again.');
    }
  }

  /**
   * Analyze an image from a File object and generate product description and pricing
   */
  async analyzeProductImageFromFile(file: File, options?: { isVirtual?: boolean }): Promise<AIAnalysisResult> {
    try {
      // Convert file to base64
      const base64Image = await this.fileToBase64(file);

      // Prepare the prompt for the AI
      let prompt: string;
      if (options?.isVirtual) {
        prompt = `
          Analyze this product as a virtual/digital copy of a design as image for sale. There is no physical product, only a digital PDF or image will be provided to the buyer. Return ONLY a JSON response with no additional text, markdown, or formatting.

          Product Details:
          (This is a virtual product, not a physical item)

          Return exactly this JSON structure (all prices in INR - Indian Rupees, ₹):
          {
            "title": "unique descriptive title here",
            "description": "detailed description here",
            "pricingSuggestion": {
              "minPrice": 500,
              "maxPrice": 1500,
              "reasoning": "pricing reasoning here"
            },
            "category": "category name",
            "tags": ["tag1", "tag2", "tag3"],
            "productType": "vertical"
          }

          Requirements:
          1. A unique, descriptive product title (3-6 words) that captures:
             - The specific type/style of the item
             - Key features of the design (tutorial, recipe, template, etc.)
             - Cultural or regional elements if present
             - Avoid generic words like "Beautiful" or "Amazing"
             - Be specific and memorable

          2. A detailed, engaging product description (2-3 sentences) that highlights:
             - What the design contains (steps, instructions, templates, etc.)
             - Value for the buyer
             - Unique features

          3. A pricing suggestion in Indian Rupees (₹) with reasoning based on:
             - Content quality
             - Usefulness
             - Market value for similar digital products
             - Uniqueness

          4. Product category (e.g., Tutorial, Recipe, Template, Digital Art)

          5. Relevant tags for searchability

          6. Product type for AR placement:
             - "vertical" for items typically displayed vertically (tutorials, wall art, etc.)
             - "horizontal" for items typically displayed horizontally (floor art, templates, etc.)

          IMPORTANT:
          - Currency must be INR (₹) suitable for Indian online marketplace buyers
          - Use realistic rupee values (do not output dollars)
          - Return ONLY the JSON object, no markdown, no code blocks, no additional text.
          Focus on helping sellers understand the true value of their digital work and avoid underpricing.
        `;
      } else {
        prompt = `
          Analyze this image of an artisanal product and provide ONLY a JSON response with no additional text, markdown, or formatting.

          Return exactly this JSON structure (all prices in INR - Indian Rupees, ₹):
          {
            "title": "unique descriptive title here",
            "description": "detailed description here",
            "pricingSuggestion": {
              "minPrice": 500,
              "maxPrice": 1500,
              "reasoning": "pricing reasoning here"
            },
            "category": "category name",
            "tags": ["tag1", "tag2", "tag3"],
            "productType": "vertical"
          }

          Requirements:
          1. A unique, descriptive product title (3-6 words) that captures:
             - The specific type/style of the item
             - Key visual characteristics
             - Cultural or regional elements if present
             - Avoid generic words like "Beautiful" or "Amazing"
             - Be specific and memorable

          2. A detailed, engaging product description (2-3 sentences) that highlights:
             - Materials used
             - Craftsmanship quality
             - Cultural significance
             - Unique features

          3. A pricing suggestion in Indian Rupees (₹) with reasoning based on:
             - Materials quality
             - Craftsmanship complexity
             - Market value for similar items
             - Cultural significance
             - Uniqueness

          4. Product category (e.g., Pottery, Textiles, Jewelry, Woodwork, Metalwork)

          5. Relevant tags for searchability

          6. Product type for AR placement:
             - "vertical" for items typically displayed vertically (paintings, wall hangings, pottery, sculptures, artwork, canvas, frames)
             - "horizontal" for items typically displayed horizontally (rangoli, kolam, floor art, carpets, mats, rugs, table runners)

          IMPORTANT:
          - Currency must be INR (₹) suitable for Indian online marketplace buyers
          - Use realistic rupee values (do not output dollars)
          - Return ONLY the JSON object, no markdown, no code blocks, no additional text.
          Focus on helping artisans understand the true value of their work and avoid underpricing.
        `;
      }

      // Create the image part for the API
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: file.type || 'image/jpeg'
        }
      };

      // Generate content using Gemini 1.5 Flash
      const result = await this.model.generateContent([prompt, imagePart]);
      const response_text = result.response.text();

      // Extract JSON from the response (AI might return markdown with code blocks)
      let jsonText = response_text;

      // Remove markdown code blocks if present
      if (response_text.includes('```json')) {
        const jsonMatch = response_text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
      } else if (response_text.includes('```')) {
        // Handle case where AI returns just code blocks without language specifier
        const codeMatch = response_text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonText = codeMatch[1].trim();
        }
      }

      // Clean up any remaining markdown or extra text
      jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

      // Parse the JSON response
      let aiResult;
      try {
        aiResult = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Raw response:', response_text);
        console.error('Extracted JSON text:', jsonText);
        throw new Error('AI response format is invalid. Please try again with a different image.');
      }

      // Validate the response structure
      if (!aiResult.title || !aiResult.description || !aiResult.pricingSuggestion || !aiResult.category || !aiResult.tags || !aiResult.productType) {
        console.error('Invalid AI response structure:', aiResult);
        throw new Error('AI response is incomplete. Please try again.');
      }

      return {
        title: aiResult.title,
        description: aiResult.description,
        pricingSuggestion: {
          minPrice: parseFloat(aiResult.pricingSuggestion.minPrice),
          maxPrice: parseFloat(aiResult.pricingSuggestion.maxPrice),
          reasoning: aiResult.pricingSuggestion.reasoning
        },
        category: aiResult.category,
        tags: aiResult.tags,
        productType: aiResult.productType
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze image. Please try again.');
    }
  }

  /**
   * Analyze an image from URL and generate product description and pricing
   */
  async analyzeProductImage(imageUrl: string): Promise<AIAnalysisResult> {
    try {
      // Fetch the image from URL
      const response = await fetch(imageUrl);
      const imageBlob = await response.blob();
      
      // Convert blob to base64
      const base64Image = await this.blobToBase64(imageBlob);
      
      // Prepare the prompt for the AI
      const prompt = `
        Analyze this image of an artisanal product and provide ONLY a JSON response with no additional text, markdown, or formatting.
        
        Return exactly this JSON structure (all prices in INR - Indian Rupees, ₹):
        {
          "title": "unique descriptive title here",
          "description": "detailed description here",
          "pricingSuggestion": {
            "minPrice": 500,
            "maxPrice": 1500,
            "reasoning": "pricing reasoning here"
          },
          "category": "category name",
          "tags": ["tag1", "tag2", "tag3"],
          "productType": "vertical"
        }
        
        Requirements:
        1. A unique, descriptive product title (3-6 words) that captures:
           - The specific type/style of the item
           - Key visual characteristics
           - Cultural or regional elements if present
           - Avoid generic words like "Beautiful" or "Amazing"
           - Be specific and memorable
        
        2. A detailed, engaging product description (2-3 sentences) that highlights:
           - Materials used
           - Craftsmanship quality
           - Cultural significance
           - Unique features
        
        3. A pricing suggestion in Indian Rupees (₹) with reasoning based on:
           - Materials quality
           - Craftsmanship complexity
           - Market value for similar items
           - Cultural significance
           - Uniqueness
        
        4. Product category (e.g., Pottery, Textiles, Jewelry, Woodwork, Metalwork)
        
        5. Relevant tags for searchability
        
        6. Product type for AR placement:
           - "vertical" for items typically displayed vertically (paintings, wall hangings, pottery, sculptures, artwork, canvas, frames)
           - "horizontal" for items typically displayed horizontally (rangoli, kolam, floor art, carpets, mats, rugs, table runners)
        
        IMPORTANT:
        - Currency must be INR (₹) suitable for Indian online marketplace buyers
        - Use realistic rupee values (do not output dollars)
        - Return ONLY the JSON object, no markdown, no code blocks, no additional text.
        Focus on helping artisans understand the true value of their work and avoid underpricing.
      `;

      // Create the image part for the API
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // Generate content using Gemini 1.5 Flash
      const result = await this.model.generateContent([prompt, imagePart]);
      const response_text = result.response.text();
      
      // Extract JSON from the response (AI might return markdown with code blocks)
      let jsonText = response_text;
      
      // Remove markdown code blocks if present
      if (response_text.includes('```json')) {
        const jsonMatch = response_text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
      } else if (response_text.includes('```')) {
        // Handle case where AI returns just code blocks without language specifier
        const codeMatch = response_text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonText = codeMatch[1].trim();
        }
      }
      
      // Clean up any remaining markdown or extra text
      jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Parse the JSON response
      let aiResult;
      try {
        aiResult = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Raw response:', response_text);
        console.error('Extracted JSON text:', jsonText);
        throw new Error('AI response format is invalid. Please try again with a different image.');
      }
      
      // Validate the response structure
      if (!aiResult.title || !aiResult.description || !aiResult.pricingSuggestion || !aiResult.category || !aiResult.tags || !aiResult.productType) {
        console.error('Invalid AI response structure:', aiResult);
        throw new Error('AI response is incomplete. Please try again.');
      }
      
      return {
        title: aiResult.title,
        description: aiResult.description,
        pricingSuggestion: {
          minPrice: parseFloat(aiResult.pricingSuggestion.minPrice),
          maxPrice: parseFloat(aiResult.pricingSuggestion.maxPrice),
          reasoning: aiResult.pricingSuggestion.reasoning
        },
        category: aiResult.category,
        tags: aiResult.tags,
        productType: aiResult.productType
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze image. Please try again.');
    }
  }

  /**
   * Generate enhanced product description from existing description
   */
  async enhanceDescription(existingDescription: string, category: string): Promise<string> {
    try {
      const prompt = `
        Enhance this product description for an artisanal marketplace. Make it more engaging, detailed, and marketable while maintaining authenticity.
        
        Original description: "${existingDescription}"
        Category: ${category}
        
        Focus on:
        - Storytelling and cultural significance
        - Quality and craftsmanship details
        - Emotional appeal
        - Market positioning
        
        Return only the enhanced description, no additional formatting.
      `;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Description enhancement failed:', error);
      throw new Error('Failed to enhance description. Please try again.');
    }
  }

  /**
   * Get pricing insights for a product category
   */
  async getPricingInsights(category: string, materials: string[]): Promise<{
    marketRange: { min: number; max: number };
    factors: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = `
        Provide pricing insights for ${category} products made with ${materials.join(', ')}.
        
        Include:
        1. Market price range for similar items
        2. Key factors affecting pricing
        3. Specific recommendations for artisans
        
        Format as JSON:
        {
          "marketRange": {"min": 50, "max": 200},
          "factors": ["factor1", "factor2"],
          "recommendations": ["rec1", "rec2"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response_text = result.response.text();
      return JSON.parse(response_text);
    } catch (error) {
      console.error('Pricing insights failed:', error);
      throw new Error('Failed to get pricing insights. Please try again.');
    }
  }

  /**
   * Convert file to base64 for image processing
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert blob to base64 for image processing
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export default AIService;
