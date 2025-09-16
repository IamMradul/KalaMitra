'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { testLanguageSupport } from '@/lib/translate'
import TranslationTest from '@/components/TranslationTest'

interface GoogleSession {
  id: string;
  email: string;
  name: string;
  // add more fields if needed
}

interface LocalStorageData {
  googleSession: GoogleSession | null;
  allKeys: string[];
}

interface LanguageTestResult {
  language: string;
  supported: boolean;
  method: string;
  result?: string;
  error?: string;
  loading: boolean;
}

export default function DebugPage() {
  const { user, profile, loading } = useAuth()
  const [localStorageData, setLocalStorageData] = useState<LocalStorageData | null>(null)
  const [languageTests, setLanguageTests] = useState<LanguageTestResult[]>([])
  const [testingLanguages, setTestingLanguages] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const googleSession = localStorage.getItem('googleUserSession')
      setLocalStorageData({
        googleSession: googleSession ? JSON.parse(googleSession) : null,
        allKeys: Object.keys(localStorage)
      })
    }
  }, [])

  const testAllLanguages = async () => {
    setTestingLanguages(true)
    const languages = [
      'en', 'hi', 'assamese', 'bengali', 'bodo', 'dogri', 'gujarati', 'kannad', 
      'kashmiri', 'konkani', 'maithili', 'malyalam', 'manipuri', 'marathi', 
      'nepali', 'oriya', 'punjabi', 'sanskrit', 'santhali', 'sindhi', 'tamil', 'telgu', 'urdu'
    ]
    
    const results: LanguageTestResult[] = []
    
    for (const lang of languages) {
      const result: LanguageTestResult = {
        language: lang,
        supported: false,
        method: 'none',
        loading: true
      }
      results.push(result)
      setLanguageTests([...results])
      
      try {
        const testResult = await testLanguageSupport(lang)
        result.supported = testResult.supported
        result.method = testResult.method
        result.result = testResult.result
        result.error = testResult.error
        result.loading = false
      } catch (error) {
        result.supported = false
        result.method = 'error'
        result.error = error instanceof Error ? error.message : 'Unknown error'
        result.loading = false
      }
      
      setLanguageTests([...results])
    }
    
    setTestingLanguages(false)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AuthContext State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">AuthContext State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {user ? 'Present' : 'None'}</p>
              {user && (
                <div className="ml-4 text-sm">
                  <p>ID: {user.id}</p>
                  <p>Email: {user.email}</p>
                  <p>Name: {'name' in user ? user.name : 'N/A'}</p>
                </div>
              )}
              <p><strong>Profile:</strong> {profile ? 'Present' : 'None'}</p>
              {profile && (
                <div className="ml-4 text-sm">
                  <p>ID: {profile.id}</p>
                  <p>Name: {profile.name}</p>
                  <p>Role: {profile.role}</p>
                </div>
              )}
            </div>
          </div>

          {/* LocalStorage State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">LocalStorage State</h2>
            <div className="space-y-2">
              <p><strong>Google Session:</strong> {localStorageData?.googleSession ? 'Present' : 'None'}</p>
              {localStorageData?.googleSession && (
                <div className="ml-4 text-sm">
                  <p>ID: {localStorageData.googleSession.id}</p>
                  <p>Email: {localStorageData.googleSession.email}</p>
                  <p>Name: {localStorageData.googleSession.name}</p>
                </div>
              )}
              <p><strong>All Keys:</strong></p>
              <div className="ml-4 text-sm">
                {localStorageData?.allKeys?.map((key: string) => (
                  <p key={key}>• {key}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Translation Debug */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Translation Debug</h2>
          <div className="mb-4">
            <button
              onClick={testAllLanguages}
              disabled={testingLanguages}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {testingLanguages ? 'Testing Languages...' : 'Test All Languages'}
            </button>
          </div>
          
          {languageTests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Language</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Supported</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Method</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Result</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {languageTests.map((test, index) => (
                    <tr key={index} className={test.supported ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="border border-gray-300 px-4 py-2 font-medium">{test.language}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {test.loading ? (
                          <span className="text-blue-500">Testing...</span>
                        ) : test.supported ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-red-600">✗ No</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{test.method}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{test.result || '-'}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-red-600">{test.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Quick Translation Test */}
          <div className="mt-6">
            <TranslationTest />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={() => {
                localStorage.removeItem('googleUserSession')
                window.location.reload()
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Google Session
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
