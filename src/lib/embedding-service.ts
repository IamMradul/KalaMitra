import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

/**
 * A singleton class to handle the feature-extraction pipeline.
 * This ensures that the model is loaded only once, improving performance.
 */
class EmbeddingPipeline {
  static task = 'feature-extraction' as const;
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: Promise<FeatureExtractionPipeline> | null = null;

  /**
   * Get the singleton instance of the pipeline.
   * @returns {Promise<FeatureExtractionPipeline>} A promise that resolves to the pipeline instance.
   */
  static async getInstance(): Promise<FeatureExtractionPipeline> {
    if (this.instance === null) {
      console.log('Initializing embedding model for the first time...');
      this.instance = pipeline(this.task, this.model) as Promise<FeatureExtractionPipeline>;
    }
    return this.instance;
  }
}

/**
 * Generates an embedding for a given text.
 * @param {string} text The text to generate an embedding for.
 * @returns {Promise<number[]>} A promise that resolves to the embedding vector.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const extractor = await EmbeddingPipeline.getInstance();
  const result = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });
  // Convert the Float32Array to a regular array
  return Array.from(result.data);
};
