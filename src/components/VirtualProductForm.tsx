'use client'

import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
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
    virtual_type?: string // <-- Added for virtual products
    virtual_file_url?: string // <-- Added for virtual products

  }
}
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}



interface TutorialRecipeFlowProps {
    onBack: () => void;
    onComplete?: (pdfUrl: string) => void;
  }



export default function AIProductForm({ 
  onSubmit, 
  onCancel, 
  loading = false,
  initialData = {}
}: AIProductFormProps) {
  // ...existing code...
  const [step, setStep] = useState(initialData && Object.keys(initialData).length > 0 ? 1 : 0);
  // step 0: choose option, step 1: show form/flow
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
  const [virtualType, setVirtualType] = useState(initialData.virtual_type || 'kolam')
  const [isVirtual, setIsVirtual] = useState(true); // Always true for VirtualProductForm
  const [virtualFileUrl, setVirtualFileUrl] = useState(initialData.virtual_file_url || '');
  const [file, setFile] = useState<File | null>(null);
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
      const prompt = `Write a short heritage story for this product.\nTitle: ${title}\nCategory: ${category}\nDescription: ${description}\nPrice: ${price}\nStory (if any): ${story} . Do not include any extra fields or formatting. Return only the story text.`
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
      setFile(file)
      setVirtualFileUrl(url)
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
    // Support both image and PDF analysis (check for PDF preview url and file type)
    if (!imageUrl && !(virtualFileUrl && file && file.type === 'application/pdf') && !(uploadedFile && uploadedFile.type === 'application/pdf')) {
      setError('Please provide an image or PDF first');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const aiService = AIService.getInstance();

      if (uploadedFile) {
        if (uploadedFile.type === 'application/pdf') {
          // PDF analysis as virtual product
          const result = await aiService.analyzeProductPdf(uploadedFile, {
            title,
            category,
            description,
            price,
            virtualFileUrl,
            isVirtual: true
          });
          setAiResult(result);
          setShowAiResult(true);
        } else {
            // Image analysis as virtual product
            const result = await aiService.analyzeProductImageFromFile(uploadedFile, { isVirtual: true });
            setAiResult(result);
            setShowAiResult(true);
        }
      } else if (virtualFileUrl && file && file.type === 'application/pdf') {
        // PDF analysis from virtualFileUrl (PDF uploaded, but not in uploadedFile)
        const result = await aiService.analyzeProductPdf(file, {
          title,
          category,
          description,
          price,
          virtualFileUrl,
          isVirtual: true
        });
        setAiResult(result);
        setShowAiResult(true);
      } else if (imageUrl) {
    // Image analysis from URL (no isVirtual option)
    const result = await aiService.analyzeProductImage(imageUrl);
    setAiResult(result);
    setShowAiResult(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.form.errors.analyzeFailed'));
    } finally {
      setIsAnalyzing(false);
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

  const uploadedFileUrl = '';
      // Handle image upload
      if (uploadedFile && uploadedFile.type !== 'application/pdf') {
        // Upload original image
        const originalUrl = await uploadImageToSupabase(uploadedFile);
        formData.set('virtual_file_url', originalUrl);
        // Generate watermark image and upload
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        const watermarkUrl = await new Promise<string>(resolve => {
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              // Add diagonal watermark
              const watermarkText = 'KalaMitra';
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(-Math.atan(canvas.height / canvas.width));
              ctx.globalAlpha = 0.44;
              ctx.font = `bold ${Math.floor(canvas.width / 8)}px sans-serif`;
              ctx.fillStyle = '#FF6600';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(watermarkText, 0, 0);
              ctx.restore();
              canvas.toBlob(async blob => {
                if (blob) {
                  const watermarkFile = new File([blob], `watermarked-${Date.now()}.png`, { type: 'image/png' });
                  const url = await uploadImageToSupabase(watermarkFile);
                  resolve(url);
                } else {
                  resolve(originalUrl); // fallback to original
                }
              }, 'image/png');
            } else {
              resolve(originalUrl); // fallback to original
            }
          };
          img.onerror = () => {
            resolve(originalUrl); // fallback to original
          };
          img.src = URL.createObjectURL(uploadedFile);
        });
        formData.set('imageUrl', watermarkUrl);
      }
      // Handle PDF upload
      else if (file && file.type === 'application/pdf') {
        // 1. Upload PDF file to Supabase
        const pdfUrl = await uploadImageToSupabase(file); // PDF file itself
        formData.set('virtual_file_url', pdfUrl); // PDF URL for virtual_file_url

        // 2. Upload preview image generated by PDF.js to Supabase
        // Find the preview image blob from the imageUrl (should be a blob: URL)
        let previewImageUrl = '';
        if (imageUrl && imageUrl.startsWith('blob:')) {
          try {
            // Fetch the blob from the blob URL
            const response = await fetch(imageUrl);
            const imageBlob = await response.blob();
            // Create a File object for Supabase upload
            const previewFile = new File([imageBlob], `pdf-preview-${Date.now()}.png`, { type: 'image/png' });
            previewImageUrl = await uploadImageToSupabase(previewFile);
            formData.set('imageUrl', previewImageUrl); // Use preview image for imageUrl
          } catch (err) {
            // Fallback: use PDF URL if preview upload fails
            formData.set('imageUrl', pdfUrl);
          }
        } else {
          // Fallback: use PDF URL if no preview
          formData.set('imageUrl', pdfUrl);
        }
      }
      // Handle image URL
      else if (imageUrl && !imageUrl.startsWith('blob:')) {
        formData.set('imageUrl', imageUrl);
        formData.set('virtual_file_url', imageUrl);
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
      // Ensure virtual type is saved
      formData.set('virtual_type', virtualType);
      // Ensure is_virtual is saved
      formData.set('is_virtual', 'true');

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

  type TutorialInsertPayload = {
    title: string;
    steps: string[];
    pdfUrl?: string;
  };

  function TutorialFlow({ onBack, onInsertToForm, setError }: { onBack: () => void; onInsertToForm?: (payload: TutorialInsertPayload) => void; setError: (v: string) => void }) {
    // local state
    const [tutorialTitle, setTutorialTitle] = useState('')
    const [tutorialSteps, setTutorialSteps] = useState<string[]>([''])
    const [listeningIndex, setListeningIndex] = useState<number | 'title' | null>(null)
    const tutorialRecRef = useRef<SpeechRecognition | null>(null)
    const [isRefining, setIsRefining] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')

    const startListeningFor = async (target: number | 'title') => {
      try {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
          setError('Speech recognition not supported in this browser.')
          return
        }
        const SpeechRecognitionCtor =
          (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
          (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
          setError('Speech recognition not supported in this browser.')
          return
        }
        const recognition: SpeechRecognition = new SpeechRecognitionCtor()
        const appLang = currentLanguage || 'en'
        // Simple mapping fallback - reuse same mapping used above where possible
        const langMap: Record<string, string> = {
          en: 'en-IN',
          hi: 'hi-IN'
          // fallback will be appLang
        }
        recognition.lang = langMap[appLang] || appLang || 'en-IN'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript
          if (target === 'title') {
            setTutorialTitle(prev => prev ? prev + ' ' + transcript : transcript)
          } else {
            setTutorialSteps(prev => {
              const copy = [...prev]
              copy[target] = copy[target] ? copy[target] + ' ' + transcript : transcript
              return copy
            })
          }
        }
        recognition.onerror = () => {
          setError('Speech recognition error while recording tutorial.')
          setListeningIndex(null)
        }
        recognition.onend = () => {
          setListeningIndex(null)
        }
        tutorialRecRef.current = recognition
        recognition.start()
        setListeningIndex(target)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start speech recognition.')
      }
    }

    const stopListening = () => {
      if (tutorialRecRef.current) {
        try {
          tutorialRecRef.current.stop()
        } catch (e) {
          // ignore
        }
        tutorialRecRef.current = null
      }
      setListeningIndex(null)
    }

    const addStep = () => setTutorialSteps(prev => [...prev, ''])
    const removeStep = (idx: number) => setTutorialSteps(prev => prev.filter((_, i) => i !== idx))
    const updateStep = (idx: number, text: string) => setTutorialSteps(prev => prev.map((s, i) => i === idx ? text : s))

    const refineWithAI = async () => {
      setIsRefining(true)
      setError('')
      try {
        const response = await fetch('/api/refine-tutorial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: tutorialTitle, steps: tutorialSteps })
        })
        if (!response.ok) throw new Error('AI refinement failed')
        const data = await response.json()
        if (data?.title) setTutorialTitle(data.title)
        if (Array.isArray(data?.steps)) setTutorialSteps(data.steps)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refine tutorial')
      } finally {
        setIsRefining(false)
      }
    }

    const generatePdf = async () => {
      setIsGeneratingPdf(true)
      setError('')
      setPdfUrl('')
      try {
        // Determine a friendly name for the creator (prefer profile name, fallback to email or id)
        const createdByName = profile?.name?.trim()
          ? profile.name
          : (user?.email ?? user?.id ?? 'Unknown')
        const createdById = user?.id ?? null

        const response = await fetch('/api/generate-tutorial-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: tutorialTitle,
            steps: tutorialSteps,
            createdByName,
            createdById
          })
        })
        if (!response.ok) throw new Error('PDF generation failed')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF')
      } finally {
        setIsGeneratingPdf(false)
      }
    }

    const insertToForm = () => {
      if (onInsertToForm) onInsertToForm({ title: tutorialTitle, steps: tutorialSteps, pdfUrl })
      // Instead of onBack, open the product form and prefill PDF
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-orange-700 flex items-center gap-3">
              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </span>
              {t('ai.virtualForm.virtual.tutorialCreator', { defaultValue: 'Tutorial / Recipe Creator' })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                {t('ai.virtualForm.virtual.back', { defaultValue: 'Back' })}
              </button>
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('ai.virtualForm.virtual.fields.tutorialTitle.label', { defaultValue: 'Title' })}
          </label>
          <div className="relative">
            <input
              value={tutorialTitle}
              onChange={e => setTutorialTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder={t('ai.virtualForm.virtual.fields.tutorialTitle.placeholder', { defaultValue: 'Enter tutorial / recipe title' })}
            />
            <button
              type="button"
              onClick={listeningIndex === 'title' ? stopListening : () => startListeningFor('title')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
            >
              <Mic className={`w-5 h-5 ${listeningIndex === 'title' ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('ai.virtualForm.virtual.fields.tutorialSteps.label', { defaultValue: 'Steps' })}
          </label>
          <div className="space-y-3">
            {tutorialSteps.map((stepText, idx) => (
              <div key={idx} className="p-3 border border-gray-200 rounded-lg relative">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <textarea
                      rows={3}
                      value={stepText}
                      onChange={e => updateStep(idx, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder={t('ai.virtualForm.virtual.fields.tutorialSteps.stepPlaceholder', { idx: idx + 1, defaultValue: `Step ${idx + 1} description` })}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {t('ai.virtualForm.virtual.fields.tutorialSteps.helper', { defaultValue: 'You can record each step with the mic, then refine with AI.' })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={listeningIndex === idx ? stopListening : () => startListeningFor(idx)}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-50"
                      title={listeningIndex === idx ? 'Stop' : 'Record'}
                    >
                      <Mic className={`w-5 h-5 ${listeningIndex === idx ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-red-500"
                      title="Remove step"
                    >
                      ✖
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={addStep} className="px-3 py-2 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-lg">
              {t('ai.virtualForm.virtual.fields.tutorialSteps.addStep', { defaultValue: '+ Add Step' })}
            </button>
            <button onClick={refineWithAI} disabled={isRefining} className="px-3 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg disabled:opacity-50">
              {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : t('ai.virtualForm.virtual.fields.tutorialSteps.refineWithAI', { defaultValue: 'Refine with AI' })}
            </button>
            <button onClick={generatePdf} disabled={isGeneratingPdf} className="px-3 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50">
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : t('ai.virtualForm.virtual.fields.tutorialSteps.generatePdf', { defaultValue: 'Generate PDF' })}
            </button>
          </div>
        </div>

        {pdfUrl && (
          <div className="p-3 border border-green-100 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-green-800 underline">
                  {t('ai.virtualForm.virtual.fields.tutorialSteps.openPdf', { defaultValue: 'Open generated PDF' })}
                </a>
                <a href={pdfUrl} download className="text-sm text-green-800 underline">
                  {t('ai.virtualForm.virtual.fields.tutorialSteps.downloadPdf', { defaultValue: 'Download' })}
                </a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(pdfUrl); }} className="px-2 py-1 bg-white border rounded">
                  {t('ai.virtualForm.virtual.fields.tutorialSteps.copyLink', { defaultValue: 'Copy Link' })}
                </button>
                <button onClick={insertToForm} className="px-3 py-1 bg-cyan-600 text-white rounded">
                  {t('ai.virtualForm.virtual.fields.tutorialSteps.insertToProduct', { defaultValue: 'Insert to Product' })}
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('ai.virtualForm.virtual.fields.tutorialSteps.preview', { defaultValue: 'Preview' })}
          </label>
          <div className="p-3 border border-gray-100 rounded-lg bg-white text-sm">
            <h3 className="font-semibold mb-2">{tutorialTitle || t('ai.virtualForm.virtual.fields.tutorialSteps.untitled', { defaultValue: 'Untitled tutorial' })}</h3>
            <ol className="list-decimal pl-5 space-y-2">
              {tutorialSteps.map((s, i) => (
                <li key={i} className="text-gray-700">
                  {s || <em className="text-gray-400">{t('ai.virtualForm.virtual.fields.tutorialSteps.emptyStep', { idx: i + 1, defaultValue: `Step ${i + 1} (empty)` })}</em>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {step === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-3">
              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </span>
              {t('ai.virtualForm.virtual.creationTitle', { defaultValue: 'AI-Powered Product Creation' })}
            </h2>
            <p className="text-base text-gray-600 mb-4 text-center">
              {t('ai.virtualForm.virtual.chooseCreationMethod', { defaultValue: 'Choose how you want to create your virtual product:' })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <button
                className="flex flex-col items-center justify-center px-6 py-5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-bold shadow hover:scale-105 transition-all duration-200"
                onClick={() => window.open('https://kolamai.vercel.app/creation', '_blank')}
              >
                <span className="text-3xl mb-2">🎨</span>
                {t('ai.virtualForm.virtual.kolamAI', { defaultValue: 'Kolam AI' })}
                <span className="text-xs mt-1">
                  {t('ai.virtualForm.virtual.kolamAIDesc', { defaultValue: 'Create Kolam/Rangoli designs with AI' })}
                </span>
              </button>
              <button
                className="flex flex-col items-center justify-center px-6 py-5 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 text-white font-bold shadow hover:scale-105 transition-all duration-200"
                onClick={() => setStep(2)}
              >
                <span className="text-3xl mb-2">📖</span>
                {t('ai.virtualForm.virtual.tutorialRecipe', { defaultValue: 'Tutorial/Recipe' })}
                <span className="text-xs mt-1">
                  {t('ai.virtualForm.virtual.tutorialRecipeDesc', { defaultValue: 'Create a tutorial or recipe (mic input, AI, PDF)' })}
                </span>
              </button>
              <button
                className="flex flex-col items-center justify-center px-6 py-5 rounded-xl bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 font-bold shadow hover:scale-105 transition-all duration-200"
                onClick={() => setStep(1)}
              >
                <span className="text-3xl mb-2">⬆️</span>
                {t('ai.virtualForm.virtual.directUpload', { defaultValue: 'Direct Upload' })}
                <span className="text-xs mt-1">
                  {t('ai.virtualForm.virtual.directUploadDesc', { defaultValue: 'Upload an existing product (full form)' })}
                </span>
              </button>
            </div>
            <button
              onClick={onCancel}
              className="mt-6 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : step === 1 ? (
          // Full form for direct upload and editing
          <>
        {/* ...existing form code (full form) goes here... */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <span className="inline-flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </span>
              {t('ai.virtualForm.virtual.creationTitle')}
            </h2>
            <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
            >
          <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-base text-gray-600 mt-1">
            {t('ai.virtualForm.virtual.productCreationDesc')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gemini PDF Analysis Section */}
          {/* Image/PDF Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              {t('ai.form.productImage')}
            </label>
            <div className="flex space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type === 'application/pdf') {
                      // PDF upload logic
                      const url = URL.createObjectURL(file);
                      setVirtualFileUrl(url);
                      setFile(file);
                      setUploadedFile(null);
                      setAiResult(null);
                      setShowAiResult(false);
                      setError('');
                      setAdVideoUrl('');

                      // Create preview image from first page of PDF using PDF.js
                      try {
                        
                        // Set workerSrc if needed (for browser)
                        if (pdfjsLib.GlobalWorkerOptions) {
                          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
                        }
                        const fileReader = new FileReader();
                        const pdfData = await new Promise<ArrayBuffer>((resolve, reject) => {
                          fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
                          fileReader.onerror = reject;
                          fileReader.readAsArrayBuffer(file);
                        });
                        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                        const page = await pdf.getPage(1);
                        const viewport = page.getViewport({ scale: 2 });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const context = canvas.getContext('2d');
                        if (!context) {
                          setError('Failed to extract image from PDF: Canvas context error');
                          setImageUrl('');
                          return;
                        }
                        await page.render({ canvasContext: context, viewport, canvas }).promise;
                          // Add a single diagonal watermark across the center
                          const watermarkText = 'KalaMitra';
                          context.save();
                          context.translate(canvas.width / 2, canvas.height / 2);
                          context.rotate(-Math.atan(canvas.height / canvas.width));
                          context.globalAlpha = 0.22;
                          context.font = `bold ${Math.floor(canvas.width / 8)}px sans-serif`;
                          context.fillStyle = '#FF6600';
                          context.textAlign = 'center';
                          context.textBaseline = 'middle';
                          context.fillText(watermarkText, 0, 0);
                          context.restore();
                        // Convert canvas to blob and set imageUrl
                        const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                        if (imageBlob) {
                          const blobUrl = URL.createObjectURL(imageBlob);
                          setImageUrl(blobUrl);
                        } else {
                          setError('Failed to extract image from PDF: Canvas toBlob error');
                          setImageUrl('');
                        }
                      } catch (err) {
                        setError('Failed to extract image from PDF: ' + (err instanceof Error ? err.message : String(err)));
                        setImageUrl('');
                      }
                    } else {
                      // Image upload logic
                      const url = URL.createObjectURL(file);
                      setVirtualFileUrl(url); // keep original image for upload
                      setUploadedFile(file);
                      setFile(file);
                      setAiResult(null);
                      setShowAiResult(false);
                      setError('');
                      setAdVideoUrl('');
                      // Create watermark preview for setImageUrl
                      const img = new window.Image();
                      img.crossOrigin = 'anonymous';
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(img, 0, 0);
                          // Add diagonal watermark
                          const watermarkText = 'KalaMitra';
                          ctx.save();
                          ctx.translate(canvas.width / 2, canvas.height / 2);
                          ctx.rotate(-Math.atan(canvas.height / canvas.width));
                          ctx.globalAlpha = 0.44;
                          ctx.font = `bold ${Math.floor(canvas.width / 8)}px sans-serif`;
                          ctx.fillStyle = '#FF6600';
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'middle';
                          ctx.fillText(watermarkText, 0, 0);
                          ctx.restore();
                          canvas.toBlob(blob => {
                            if (blob) {
                              const watermarkUrl = URL.createObjectURL(blob);
                              setImageUrl(watermarkUrl);
                            } else {
                              setImageUrl(url); // fallback to original
                            }
                          }, 'image/png');
                        } else {
                          setImageUrl(url); // fallback to original
                        }
                      };
                      img.onerror = () => {
                        setImageUrl(url); // fallback to original
                      };
                      img.src = url;
                    }
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('ai.form.uploadImage')} / PDF
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

            {/* Image or PDF Preview with shared AI buttons */}
            {(imageUrl || (virtualFileUrl && file && file.type === 'application/pdf')) && (
              <div className="relative">
                {file && file.type === 'application/pdf' ? (
                  <iframe
                    src={virtualFileUrl}
                    title="PDF Preview"
                    className="w-full h-48 rounded-lg border border-gray-200"
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt={t('ai.form.productPreviewAlt')}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                )}
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

            {/* PDF Preview is now only shown above with shared AI buttons */}
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
            <p className="text-blue-800 mb-1"><strong>{t('ai.form.fields.arType.label', { defaultValue: 'AR Type:' })}</strong> {aiResult.productType === 'vertical' ? t('ai.form.fields.arType.vertical', { defaultValue: 'Vertical (Wall/Standing)' }) : t('ai.form.fields.arType.horizontal', { defaultValue: 'Horizontal (Floor/Table)' })}</p>
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
            <div className="text-xs text-gray-500 mt-1">{t('ai.form.fields.description.helper', { defaultValue: 'You can speak your description for easier input.' })}</div>
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
          <div className="text-xs text-orange-500 mt-1">{t('ai.form.fields.story.helper', { defaultValue: 'Let buyers experience the story behind your product. You can speak, type, or enhance with AI (local Ollama).' })}</div>
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

          {/* Virtual Product Type */}
          <div>
            <label className="block text-sm font-medium text-cyan-700 mb-1">
                {t('ai.virtualForm.virtual.virtualTypeLabel')}
            </label>
            <div className="relative">
          <select
            name="virtual_type"
            value={virtualType}
            onChange={e => setVirtualType(e.target.value)}
            className="w-full px-3 py-2 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="kolam">{t('ai.virtualForm.virtual.virtualTypeOptions.kolam', { defaultValue: 'Kolam/Rangoli Design' })}</option>
            <option value="recipe">{t('ai.virtualForm.virtual.virtualTypeOptions.recipe', { defaultValue: 'Recipe/Tutorial' })}</option>
            <option value="template">{t('ai.virtualForm.virtual.virtualTypeOptions.template', { defaultValue: 'Printable Template' })}</option>
            <option value="other">{t('ai.virtualForm.virtual.virtualTypeOptions.other', { defaultValue: 'Other Digital Product' })}</option>
          </select>
            </div>
            <div className="text-xs text-cyan-500 mt-1">
          {t('ai.form.fields.virtualType.helper', { defaultValue: 'Select the type of virtual product you are uploading.' })}
            </div>

          </div>

          {/* CTA and Website fields for ad generation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('ai.form.ctaTextLabel', { defaultValue: 'CTA Text' })}
            </label>
            <div className="relative">
          <input
            name="ctaText"
            type="text"
            value={ctaText}
            onChange={e => setCtaText(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder={t('ai.form.ctaTextPlaceholder', { defaultValue: 'Enter call-to-action text' })}
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
          {t('ai.form.websiteLabel', { defaultValue: 'Website' })}
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
          <h4 className="text-sm font-medium text-amber-800 mb-2">💡 {t('ai.tips.title')}</h4>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• {t('ai.tips.items.uploadClearImage')}</li>
            <li>• {t('ai.tips.items.avoidUnderpricing')}</li>
            <li>• {t('ai.tips.items.personalizeDescriptions')}</li>
            <li>• {t("ai.tips.items.generateVideoAd")}</li>
            <li>• {t('ai.tips.items.culturalSignificance')}</li>
          </ul>
        </div>
          </>
        ) : step === 2 ? (
          // Guided Tutorial/Recipe flow with mic input, AI refinement and PDF generation
          <TutorialFlow
        onBack={() => setStep(0)}
        onInsertToForm={async (payload: { title: string; steps: string[], pdfUrl?: string }) => {
          // Prefill all fields and open product form with PDF
          setTitle(payload.title || title)
          setDescription(prev => prev || (payload.steps.join('\n\n') || description))
          setVirtualType('recipe')
          if (payload.pdfUrl) {
            setVirtualFileUrl(payload.pdfUrl)
            // Simulate PDF upload: fetch the PDF, create a File object, and trigger preview image generation
            try {
              // Fetch the PDF blob from the URL
              const pdfResponse = await fetch(payload.pdfUrl)
              const pdfBlob = await pdfResponse.blob()
              const pdfFile = new File([pdfBlob], 'tutorial.pdf', { type: 'application/pdf' })
              setFile(pdfFile)
              setUploadedFile(null)
              setAiResult(null)
              setShowAiResult(false)
              setError('')
              setAdVideoUrl('')
              // Generate preview image from first page using PDF.js
              try {
                if (pdfjsLib.GlobalWorkerOptions) {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
                }
                const fileReader = new FileReader()
                const pdfData = await new Promise<ArrayBuffer>((resolve, reject) => {
                  fileReader.onload = () => resolve(fileReader.result as ArrayBuffer)
                  fileReader.onerror = reject
                  fileReader.readAsArrayBuffer(pdfFile)
                })
                const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
                const page = await pdf.getPage(1)
                const viewport = page.getViewport({ scale: 2 })
                const canvas = document.createElement('canvas')
                canvas.width = viewport.width
                canvas.height = viewport.height
                const context = canvas.getContext('2d')
                if (!context) {
                  setError('Failed to extract image from PDF: Canvas context error')
                  setImageUrl('')
                } else {
                  await page.render({ canvasContext: context, viewport, canvas }).promise
                  const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
                  if (imageBlob) {
                    const blobUrl = URL.createObjectURL(imageBlob)
                    setImageUrl(blobUrl)
                  } else {
                    setError('Failed to extract image from PDF: Canvas toBlob error')
                    setImageUrl('')
                  }
                }
              } catch (err) {
                setError('Failed to extract image from PDF: ' + (err instanceof Error ? err.message : String(err)))
                setImageUrl('')
              }
            } catch (e) {
              setFile(null)
            }
          }
          setStep(1) // Open the full product form
        }}
        setError={setError}
          />
        ) : null}
      </motion.div>

      {/* TutorialFlow component defined inline to keep single-file */}
      {/* This is allowed inside the same file - small helper component */}
      {/* It uses local speech recognition (independent from global handler above) */}
      {/* Note: using a component here keeps code organized within the selection block */}
      {/* TutorialFlow props are minimal and interact with outer component via callbacks */}
      {
        /* Inline component definition */
      }

    </div>
  )
}