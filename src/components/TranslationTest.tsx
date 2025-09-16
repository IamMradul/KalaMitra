'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateText } from '@/lib/translate'

export default function TranslationTest() {
  const { i18n } = useTranslation()
  const [testText, setTestText] = useState('Hello, how are you?')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testTranslation = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await translateText(testText, i18n.language)
      setTranslatedText(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Translation Test</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Text:</label>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Current Language:</label>
          <span className="p-2 bg-blue-100 rounded">{i18n.language}</span>
        </div>
        <button
          onClick={testTranslation}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Translating...' : 'Test Translation'}
        </button>
        {translatedText && (
          <div>
            <label className="block text-sm font-medium mb-2">Translated Result:</label>
            <div className="p-2 bg-green-100 rounded">{translatedText}</div>
          </div>
        )}
        {error && (
          <div>
            <label className="block text-sm font-medium mb-2">Error:</label>
            <div className="p-2 bg-red-100 rounded text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  )
}
