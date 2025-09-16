 'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Camera, Sparkles, Save, User, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AIService from '@/lib/ai-service'
import { Database } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { translateText } from '@/lib/translate'

type Profile = Database['public']['Tables']['profiles']['Row']
type Product = Database['public']['Tables']['products']['Row']

type Props = {
  profile: Profile
  products: Product[]
  onProfileUpdate: (updatedProfile: Profile) => void
}

export default function ProfileManager({ profile, products, onProfileUpdate }: Props) {
  const { t, i18n } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    store_description: profile?.store_description || '',
    profile_image: profile?.profile_image || ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(profile?.profile_image || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(formData.name)
  const [displayBio, setDisplayBio] = useState(formData.bio)
  const [displayDesc, setDisplayDesc] = useState(formData.store_description)

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        store_description: profile.store_description || '',
        profile_image: profile.profile_image || ''
      })
      setImagePreview(profile.profile_image)
    }
  }, [profile])

  // Translate dynamic fields for display (read-only mode). Keep raw values for editing.
  useEffect(() => {
    const run = async () => {
      try {
        if (isEditing) {
          setDisplayName(formData.name)
          setDisplayBio(formData.bio)
          setDisplayDesc(formData.store_description)
          return
        }
        const [n, b, d] = await Promise.all([
          translateText(formData.name || '', i18n.language),
          translateText(formData.bio || '', i18n.language),
          translateText(formData.store_description || '', i18n.language),
        ])
        setDisplayName(n || formData.name)
        setDisplayBio(b || formData.bio)
        setDisplayDesc(d || formData.store_description)
      } catch {
        setDisplayName(formData.name)
        setDisplayBio(formData.bio)
        setDisplayDesc(formData.store_description)
      }
    }
    run()
  }, [formData.name, formData.bio, formData.store_description, i18n.language, isEditing])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `profile-images/profile-${profile.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const generateStoreDescription = async () => {
    try {
      setAiLoading(true)
      const ai = AIService.getInstance()
      const description = await ai.generateStoreDescription(
        formData.name,
        formData.bio,
        products.map(p => ({ title: p.title, category: p.category }))
      )
      setFormData(prev => ({ ...prev, store_description: description }))
    } catch (error) {
      console.error('Failed to generate store description:', error)
  alert(t('seller.profile.errors.generateDescriptionFailed'))
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      
      let imageUrl = formData.profile_image
      if (imageFile) {
        // If there is an existing profile image, delete it from storage
        if (formData.profile_image) {
          try {
            // Extract the path after the bucket name (images/)
            const url = formData.profile_image
            const match = url.match(/images\/(profile-images\/[^?]+)/)
            const filePath = match ? match[1] : null
            if (filePath) {
              const { error: deleteError } = await supabase.storage
                .from('images')
                .remove([filePath])
              if (deleteError) {
                console.warn('Failed to delete old profile image:', deleteError)
              }
            }
          } catch (deleteErr) {
            console.warn('Error while deleting old profile image:', deleteErr)
          }
        }
        try {
          imageUrl = await uploadImage(imageFile)
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError)
          alert(`Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}. ${t('seller.profile.aiDescriptionHelp')}`)
          // Continue without the new image
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          bio: formData.bio,
          store_description: formData.store_description,
          profile_image: imageUrl
        })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error

      onProfileUpdate(data)
      setIsEditing(false)
      setImageFile(null)
      
      // Show success message
  alert(t('success.profileUpdated'))
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state if profile is not available
  if (!profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card rounded-xl border p-6 mb-6"
      >
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">{t('seller.profile.loadingProfile')}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="card rounded-xl border p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)] flex items-center">
          <Store className="w-6 h-6 mr-2 text-orange-600" />
          {t('seller.profile.title')}
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          {isEditing ? t('seller.profile.cancel') : t('seller.profile.edit')}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Image Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center">
            <Camera className="w-5 h-5 mr-2 text-orange-600" />
            {t('seller.profile.profileImage')}
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden bg-[var(--bg-2)]">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-orange-600" />
              )}
            </div>
            
            {isEditing && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[var(--bg-2)] text-[var(--text)] rounded-lg hover:bg-[var(--bg-3)] transition-colors"
                >
                  {t('seller.profile.chooseImage')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">{t('seller.profile.details')}</h3>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  {t('seller.profile.fields.storeName.label')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)]"
                  placeholder={t('seller.profile.fields.storeName.placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  {t('seller.profile.fields.bio.label')}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)]"
                  placeholder={t('seller.profile.fields.bio.placeholder')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[var(--muted)]">
                    {t('seller.profile.fields.description.label')}
                  </label>
                  <button
                    onClick={generateStoreDescription}
                    disabled={aiLoading}
                    className="flex items-center text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {aiLoading ? t('seller.profile.generating') : t('seller.profile.aiGenerate')}
                  </button>
                </div>
                <textarea
                  value={formData.store_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, store_description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)]"
                  placeholder={t('seller.profile.fields.description.placeholder')}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? t('seller.profile.saving') : t('seller.profile.saveChanges')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  {t('seller.profile.fields.storeName.label')}
                </label>
                <p className="text-[var(--text)]">{displayName || t('seller.profile.notSet')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  {t('seller.profile.fields.bio.label')}
                </label>
                <p className="text-[var(--text)]">{displayBio || t('seller.profile.noBio')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  {t('seller.profile.fields.description.label')}
                </label>
                <p className="text-[var(--text)]">{displayDesc || t('seller.profile.noDescription')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="mt-6 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-2)]">
          <div className="flex items-start">
            <Sparkles className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-800 mb-1">{t('seller.profile.aiDescriptionTitle')}</h4>
              <p className="text-sm text-[var(--muted)]">
                {t('seller.profile.aiDescriptionHelp')}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
