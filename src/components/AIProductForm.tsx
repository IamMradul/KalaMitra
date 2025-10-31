'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Sparkles, 
  DollarSign, 
  Tag, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Upload,
  X,
  Video,
  Mic
} from 'lucide-react'
import AIService, { AIAnalysisResult } from '@/lib/ai-service'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useLanguage } from './LanguageProvider'
import { useAuth } from '@/contexts/AuthContext'

interface AIProductFormProps {
  onSubmit: (formData: FormData) => void
  onCancel: () => void
  loading?: boolean
  initialData?: {
    title?: string
    category?: string
    description?: string
    price?: number
    imageUrl?: string
    product_story?: string
    product_type?: 'vertical' | 'horizontal'
  }
}
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export default function AIProductForm({ 
  // Controlled state for ad generation fields

  onSubmit, 
  onCancel, 
  loading = false,
  initialData = {}
}: AIProductFormProps) {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const { user, profile } = useAuth()
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl || '')
  const [title, setTitle] = useState(initialData.title || '')
  const [category, setCategory] = useState(initialData.category || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [price, setPrice] = useState(initialData.price ? String(initialData.price) : '')
  const [story, setStory] = useState(initialData.product_story || '')
  const [productType, setProductType] = useState<'vertical' | 'horizontal'>(initialData.product_type || 'vertical')
  // Speech recognition state for all fields
  const [listeningField, setListeningField] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Generate/enhance story using Ollama (local Mistral/Gemma)
  const [isStoryGenerating, setIsStoryGenerating] = useState(false)
  const handleGenerateStory = async () => {
    setIsStoryGenerating(true)
    setError('')
    try {
      // Compose prompt from product details
      const prompt = `Write a short heritage story for this product.\nTitle: ${title}\nCategory: ${category}\nDescription: ${description}\nPrice: ${price}\nStory (if any): ${story}`
      // Call local Next.js API for story generation
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      if (!response.ok) throw new Error('Failed to generate story')
      const data = await response.json()
      if (data && data.response) {
        setStory(data.response.trim())
      } else {
        setError('No story generated')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Story generation failed')
    } finally {
      setIsStoryGenerating(false)
    }
  }
  const handleStartListening = (field: string) => {
    // Map i18next language codes to BCP-47 codes for speech recognition
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      assamese: 'as-IN',
      bengali: 'bn-IN',
      bodo: 'brx-IN',
      dogri: 'doi-IN',
      gujarati: 'gu-IN',
      kannad: 'kn-IN',
      kashmiri: 'ks-IN',
      konkani: 'kok-IN',
      maithili: 'mai-IN',
      malyalam: 'ml-IN',
      manipuri: 'mni-IN',
      marathi: 'mr-IN',
      nepali: 'ne-NP',
      oriya: 'or-IN',
      punjabi: 'pa-IN',
      sanskrit: 'sa-IN',
      santhali: 'sat-IN',
      sindhi: 'sd-IN',
      tamil: 'ta-IN',
      telgu: 'te-IN',
      urdu: 'ur-IN',
      // Also support short codes
      as: 'as-IN',
      bn: 'bn-IN',
      brx: 'brx-IN',
      doi: 'doi-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ks: 'ks-IN',
      kok: 'kok-IN',
      mai: 'mai-IN',
      ml: 'ml-IN',
      mni: 'mni-IN',
      mr: 'mr-IN',
      ne: 'ne-NP',
      or: 'or-IN',
      pa: 'pa-IN',
      sa: 'sa-IN',
      sat: 'sat-IN',
      sd: 'sd-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      ur: 'ur-IN',
    }
  const appLang = currentLanguage || 'en'
  const speechLang = langMap[appLang] || appLang || 'en-IN'
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser.')
      return
    }
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionCtor) {
    setError('Speech recognition not supported in this browser.')
    return
  }
  const recognition: SpeechRecognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      switch (field) {
        case 'title':
          setTitle(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'category':
          setCategory(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'description':
          setDescription(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'story':
          setStory(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'price':
          setPrice(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'ctaText':
          setCtaText(prev => prev ? prev + ' ' + transcript : transcript)
          break
        case 'website':
          setWebsite(prev => prev ? prev + ' ' + transcript : transcript)
          break
        default:
          break
      }
    }
    recognition.onerror = (event: Event) => {
      setError('Speech recognition error')
      setListeningField(null)
    }
    recognition.onend = () => {
      setListeningField(null)
    }
    recognitionRef.current = recognition
    recognition.start()
    setListeningField(field)
  }
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListeningField(null)
    }
  }
  const [ctaText, setCtaText] = useState('Shop Now')
  const [website, setWebsite] = useState(profile?.name?.trim() ? profile.name : 'https://yourwebsite.com')

  // Check if all required fields for ad generation are filled
  const isAdGenerationReady = !!(imageUrl && title && category && description && price && ctaText && website)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAd, setIsGeneratingAd] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)
  const [showAiResult, setShowAiResult] = useState(false)
  const [error, setError] = useState('')
  const [adVideoUrl, setAdVideoUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setUploadedFile(file)
      setAiResult(null)
      setShowAiResult(false)
      setError('')
      setAdVideoUrl('')
    }
  }

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrl(url)
    setUploadedFile(null)
    setAiResult(null)
    setShowAiResult(false)
    setError('')
    setAdVideoUrl('')
  }

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    try {
      console.log('Starting upload for file:', file.name, 'Size:', file.size)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `product-images/${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName

      console.log('Uploading to path:', filePath)

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      console.log('Upload successful, getting public URL...')

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      console.log('Public URL generated:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error in uploadImageToSupabase:', error)
      throw error
    }
  }

  const analyzeImage = async () => {
    if (!imageUrl) {
  setError(t('ai.form.errors.noImage'))
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const aiService = AIService.getInstance()
      
      if (uploadedFile) {
        const result = await aiService.analyzeProductImageFromFile(uploadedFile)
        setAiResult(result)
        setShowAiResult(true)
      } else {
        const result = await aiService.analyzeProductImage(imageUrl)
        setAiResult(result)
        setShowAiResult(true)
      }
    } catch (err) {
  setError(err instanceof Error ? err.message : t('ai.form.errors.analyzeFailed'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateAd = async () => {
    if (!imageUrl) {
      setError(t('ai.form.errors.noImage'));
      return;
    }

    setIsGeneratingAd(true);
    setError('');

    try {
      // Get form values
      const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
      const descriptionInput = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
      const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
      const ctaInput = document.querySelector('input[name="ctaText"]') as HTMLInputElement;
      // Use store name from profile for website if available
      const productName = titleInput?.value || '';
      const normalPrice = priceInput?.value || '';
      const discountedPrice = normalPrice ? (parseFloat(normalPrice) * 0.7).toFixed(2) : '';
      const ctaText = ctaInput?.value || 'Shop Now';
      const website = (profile?.store_description && profile.store_description.trim() !== '')
        ? profile.store_description
        : (document.querySelector('input[name="website"]') as HTMLInputElement)?.value || 'https://yourwebsite.com';

      const uploadedImageUrl = uploadedFile ? await uploadImageToSupabase(uploadedFile) : imageUrl;

      const response = await fetch('/api/generate-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadedImageUrl,
          productName,
          normalPrice,
          discountedPrice,
          ctaText,
          website
        })
      });

      if (!response.ok) {
        throw new Error(t('ai.form.errors.generateFailed'));
      }

      const { videoUrl } = await response.json();
      setAdVideoUrl(videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.form.errors.generateFailed'));
    } finally {
      setIsGeneratingAd(false);
    }
  }

  const applyAIResults = () => {
    if (!aiResult) return;
    setTitle(aiResult.title);
    setCategory(aiResult.category);
    setDescription(aiResult.description);
    setProductType(aiResult.productType);
    const suggestedPrice = (aiResult.pricingSuggestion.minPrice + aiResult.pricingSuggestion.maxPrice) / 2;
    setPrice(suggestedPrice.toFixed(2));
    // If you want to update ctaText/website from AI, add here
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      let uploadedImageUrl = imageUrl;
      if (uploadedFile) {
        uploadedImageUrl = await uploadImageToSupabase(uploadedFile);
        formData.set('imageUrl', uploadedImageUrl);
      } else if (imageUrl && !imageUrl.startsWith('blob:')) {
        formData.set('imageUrl', imageUrl);
      } else {
        setError(t('ai.form.errors.invalidImage'));
        setIsUploading(false);
        return;
      }

      if (adVideoUrl) {
        formData.set('adVideoUrl', adVideoUrl);
      }

      // Ensure product story is saved
      formData.set('product_story', story);
      
      // Ensure product type is saved
      formData.set('product_type', productType);

      // Save product and get productId from result
      const productId = await onSubmit(formData); // onSubmit should return productId

      // If adVideoUrl exists, insert reel into Supabase
      if (adVideoUrl && user && productId) {
        let caption = formData.get('description') as string;
        if (caption && caption.length > 255) {
          caption = caption.slice(0, 255);
        }
        const { error: reelError } = await supabase.from('reel').insert({
          user_id: user.id,
          product_id: productId,
          video_url: adVideoUrl,
          caption,
        });
        if (reelError) {
          console.error('Error posting reel:', reelError);
          setError(
            `Failed to save reel: ${reelError.message || 'Unknown error'}\nDetails: ${JSON.stringify(reelError, null, 2)}`
          );
          // Optionally, you can alert the user as well
          alert(`Failed to save reel. Please check your data and try again.\n${reelError.message}`);
        }
      }

      onCancel();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : t('ai.form.errors.uploadFailed'));
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-orange-500" />
            {t('ai.form.title')}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              {t('ai.form.productImage')}
            </label>
            
            <div className="flex space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('ai.form.uploadImage')}
              </button>
              <span className="text-gray-500 text-sm">{t('ai.form.or')}</span>
              <input
                name="imageUrl"
                type="url"
                value={imageUrl}
                onChange={handleImageUrlChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('ai.form.pasteImageUrl')}
              />
            </div>

            {imageUrl && (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={t('ai.form.productPreviewAlt')}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="flex items-center px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {isAnalyzing ? t('ai.analyzing') : t('ai.analyzeWithAI')}
                  </button>
                  <div className="relative group inline-block">
                    <button
                      type="button"
                      onClick={generateAd}
                      disabled={isGeneratingAd || !isAdGenerationReady}
                      className="flex items-center px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingAd ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Video className="w-4 h-4 mr-2" />
                      )}
                      {isGeneratingAd ? t('ai.generatingAd') : t('ai.generateAdWithAI')}
                    </button>
                    {!isAdGenerationReady && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                        {t('ai.form.fillAllFieldsForAd', { defaultValue: 'Please fill all product details (image, title, description, price, CTA, website) before generating an ad.' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ad Preview */}
          {adVideoUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('ai.generatedAdPreview')}
              </label>
              <video
                src={adVideoUrl}
                controls
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* AI Analysis Results */}
          <AnimatePresence>
            {showAiResult && aiResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-blue-800 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t('ai.aiAnalysisResults')}
                  </h4>
                  <button
                    type="button"
                    onClick={applyAIResults}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {t('ai.form.applyToForm')}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-blue-700 mb-2 flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      {t('ai.form.suggestedTitleCategory')}
                    </h5>
                    <p className="text-blue-800 mb-1"><strong>{t('ai.form.labels.title', { defaultValue: 'Title' })}:</strong> {aiResult.title}</p>
                    <p className="text-blue-800 mb-1"><strong>{t('ai.form.labels.category', { defaultValue: 'Category' })}:</strong> {aiResult.category}</p>
                    <p className="text-blue-800 mb-1"><strong>AR Type:</strong> {aiResult.productType === 'vertical' ? 'Vertical (Wall/Standing)' : 'Horizontal (Floor/Table)'}</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-blue-700 mb-2 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {t('ai.pricingSuggestion')}
                    </h5>
                    <p className="text-blue-800 mb-1">
                      <strong>{t('ai.range')}:</strong> ₹{aiResult.pricingSuggestion.minPrice} - ₹{aiResult.pricingSuggestion.maxPrice}
                    </p>
                    <p className="text-blue-700 text-sm">{aiResult.pricingSuggestion.reasoning}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <h5 className="font-medium text-blue-700 mb-2">{t('ai.aiGeneratedDescription')}</h5>
                  <p className="text-blue-800 text-sm italic">&ldquo;{aiResult.description}&rdquo;</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Product Details Form */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('ai.form.fields.title.label')}
                </label>
                <div className="relative">
                  <input
                    name="title"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={t('ai.form.fields.title.placeholder')}
                  />
                  <button
                    type="button"
                    onClick={listeningField === 'title' ? handleStopListening : () => handleStartListening('title')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                    title={listeningField === 'title' ? 'Listening...' : 'Speak Title'}
                  >
                    <Mic className={`w-5 h-5 ${listeningField === 'title' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('ai.form.fields.category.label')}
                </label>
                <div className="relative">
                  <input
                    name="category"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={t('ai.form.fields.category.placeholder')}
                  />
                  <button
                    type="button"
                    onClick={listeningField === 'category' ? handleStopListening : () => handleStartListening('category')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                    title={listeningField === 'category' ? 'Listening...' : 'Speak Category'}
                  >
                    <Mic className={`w-5 h-5 ${listeningField === 'category' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
                  </button>
                </div>
              </div>
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ai.form.fields.description.label')}
            </label>
            <div className="relative">
              <textarea
                name="description"
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('ai.form.fields.description.placeholder')}
              />
              <button
                type="button"
                onClick={listeningField === 'description' ? handleStopListening : () => handleStartListening('description')}
                className="absolute right-2 top-2 p-1 rounded-full bg-white hover:bg-gray-100"
                title={listeningField === 'description' ? 'Listening...' : 'Speak Description'}
              >
                <Mic className={`w-5 h-5 ${listeningField === 'description' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">You can speak your description for easier input.</div>
          </div>

          {/* Product Story Field */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">
              {t('ai.form.fields.story.label', { defaultValue: 'Product Story (Heritage)' })}
            </label>
            <div className="relative flex flex-col gap-2">
              <div className="relative">
                <textarea
                  name="product_story"
                  rows={3}
                  value={story}
                  onChange={e => setStory(e.target.value)}
                  className="w-full px-3 py-2 pr-20 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={t('ai.form.fields.story.placeholder', { defaultValue: 'Share the heritage, origin, or cultural story of this product...' })}
                />
                <button
                  type="button"
                  onClick={listeningField === 'story' ? handleStopListening : () => handleStartListening('story')}
                  className="absolute right-2 top-2 p-1 rounded-full bg-white hover:bg-gray-100"
                  title={listeningField === 'story' ? 'Listening...' : 'Speak Story'}
                >
                  <Mic className={`w-5 h-5 ${listeningField === 'story' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateStory}
                  disabled={isStoryGenerating}
                  className="absolute right-12 top-2 p-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow hover:scale-105 transition-all duration-200 disabled:opacity-50"
                  title={isStoryGenerating ? 'Generating...' : 'Enhance with AI'}
                >
                  {isStoryGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-xs text-orange-500 mt-1">{t('ai.form.fields.story.helper')}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ai.form.fields.price.label')}
            </label>
            <div className="relative">
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('ai.form.fields.price.placeholder')}
              />
              <button
                type="button"
                onClick={listeningField === 'price' ? handleStopListening : () => handleStartListening('price')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                title={listeningField === 'price' ? 'Listening...' : 'Speak Price'}
              >
                <Mic className={`w-5 h-5 ${listeningField === 'price' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
              </button>
            </div>
          </div>

          {/* Product Type for AR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ai.form.arDisplayType')}
            </label>
            <div className="relative">
              <select
                name="product_type"
                value={productType}
                onChange={e => setProductType(e.target.value as 'vertical' | 'horizontal')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="vertical">{t('ai.form.arDisplayTypeOptions.vertical')}</option>
                <option value="horizontal">{t('ai.form.arDisplayTypeOptions.horizontal')}</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t('ai.form.arDisplayTypeHelper')}
            </div>
          </div>

          {/* CTA and Website fields for ad generation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ai.form.ctaTextLabel')}
            </label>
            <div className="relative">
              <input
                name="ctaText"
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('ai.form.ctaTextPlaceholder')}
              />
              <button
                type="button"
                onClick={listeningField === 'ctaText' ? handleStopListening : () => handleStartListening('ctaText')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                title={listeningField === 'ctaText' ? t('common.listening', 'Listening...') : t('ai.form.ctaTextSpeak')}
              >
                <Mic className={`w-5 h-5 ${listeningField === 'ctaText' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ai.form.websiteLabel')}
            </label>
            <div className="relative">
              <input
                name="website"
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('ai.form.websitePlaceholder')}
              />
              <button
                type="button"
                onClick={listeningField === 'website' ? handleStopListening : () => handleStartListening('website')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                title={listeningField === 'website' ? t('common.listening', 'Listening...') : t('ai.form.websiteSpeak')}
              >
                <Mic className={`w-5 h-5 ${listeningField === 'website' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('ai.form.uploadingImage')}
                </>
              ) : loading ? (
                t('ai.form.saving')
              ) : (
                t('ai.form.saveProduct')
              )}
            </button>
          </div>
        </form>

        {/* AI Tips */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-2">{t('ai.form.tipsEmoji')} {t('ai.tips.title')}</h4>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• {t('ai.tips.items.uploadClearImage')}</li>
            <li>• {t('ai.tips.items.avoidUnderpricing')}</li>
            <li>• {t('ai.tips.items.personalizeDescriptions')}</li>
            <li>• {t("ai.tips.items.generateVideoAd")}</li>
            <li>• {t('ai.tips.items.culturalSignificance')}</li>
          </ul>
        </div>
      </motion.div>
    </div>
  )
}