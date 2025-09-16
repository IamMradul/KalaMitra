'use client'

import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'

export default function TranslationDebug() {
  const { t, i18n } = useTranslation()
  const { currentLanguage } = useLanguage()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
      <div><strong>Debug Info:</strong></div>
      <div>Current Language: {currentLanguage}</div>
      <div>i18n Language: {i18n.language}</div>
      <div>Brand Name: {t('brand.name')}</div>
      <div>Is Ready: {i18n.isInitialized ? 'Yes' : 'No'}</div>
      <div>Available Languages: {i18n.languages.join(', ')}</div>
    </div>
  )
}
