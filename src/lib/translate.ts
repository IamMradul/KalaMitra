// Client-safe translation utility using Google Cloud Translation API v2
// Uses NEXT_PUBLIC_GEMINI_API_KEY (enabled for Translation) per user's setup

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash'

// Map app i18n codes to Google Translation target codes
// Updated with correct ISO codes and fallback handling
const codeMap: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  assamese: 'as',
  bengali: 'bn',
  bodo: 'brx', // Bodo - may not be supported by Google Translate
  dogri: 'doi', // Dogri - may not be supported by Google Translate
  gujarati: 'gu',
  kannad: 'kn', // Kannada
  kashmiri: 'ks',
  konkani: 'gom', // Konkani - may not be supported by Google Translate
  maithili: 'mai', // Maithili - may not be supported by Google Translate
  malyalam: 'ml', // Malayalam
  manipuri: 'mni-Mtei', // Meitei (Manipuri) - may not be supported
  marathi: 'mr',
  nepali: 'ne',
  oriya: 'or', // Odia
  punjabi: 'pa',
  sanskrit: 'sa', // Sanskrit - may not be supported by Google Translate
  santhali: 'sat', // Santali - may not be supported by Google Translate
  sindhi: 'sd',
  tamil: 'ta',
  telgu: 'te', // Telugu
  urdu: 'ur',
}

// Languages that are well-supported by Google Translate API
const wellSupportedLanguages = new Set([
  'en', 'hi', 'as', 'bn', 'gu', 'kn', 'ks', 'ml', 'mr', 'ne', 'or', 'pa', 'sd', 'ta', 'te', 'ur'
])

// Languages that might not be supported - will fallback to Gemini
const potentiallyUnsupportedLanguages = new Set([
  'brx', 'doi', 'gom', 'mai', 'mni-Mtei', 'sa', 'sat'
])

// Simple in-memory cache + persistent localStorage cache (client only)
const cache = new Map<string, string>()
const LS_KEY = 'km_translate_cache_v1'

type CacheShape = Record<string, string>

function loadLSCache(): CacheShape {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CacheShape
  } catch {
    return {}
  }
}

function saveLSCache(obj: CacheShape) {
  if (typeof window === 'undefined') return
  try {
    // Keep it bounded: max ~200 entries
    const entries = Object.entries(obj)
    if (entries.length > 200) {
      const trimmed = entries.slice(entries.length - 200)
      obj = Object.fromEntries(trimmed)
    }
    localStorage.setItem(LS_KEY, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

const lsCache: CacheShape = loadLSCache()

function getFromCache(key: string): string | undefined {
  const mem = cache.get(key)
  if (mem !== undefined) return mem
  const val = lsCache[key]
  if (val !== undefined) {
    cache.set(key, val)
    return val
  }
  return undefined
}

function putInCache(key: string, val: string) {
  cache.set(key, val)
  lsCache[key] = val
  saveLSCache(lsCache)
}

function htmlUnescape(s: string): string {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

export function getGoogleLangCode(appLang: string): string | null {
  return codeMap[appLang] ?? null
}

function getLanguageName(appLang: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    assamese: 'Assamese',
    bengali: 'Bengali',
    bodo: 'Bodo',
    dogri: 'Dogri',
    gujarati: 'Gujarati',
    kannad: 'Kannada',
    kashmiri: 'Kashmiri',
    konkani: 'Konkani',
    maithili: 'Maithili',
    malyalam: 'Malayalam',
    manipuri: 'Meitei (Manipuri)',
    marathi: 'Marathi',
    nepali: 'Nepali',
    oriya: 'Odia',
    punjabi: 'Punjabi',
    sanskrit: 'Sanskrit',
    santhali: 'Santhali',
    sindhi: 'Sindhi',
    tamil: 'Tamil',
    telgu: 'Telugu',
    urdu: 'Urdu',
  }
  return names[appLang] || appLang
}

async function translateWithGoogle(texts: string[], target: string): Promise<string[] | null> {
  // Skip Google Translate for potentially unsupported languages
  if (potentiallyUnsupportedLanguages.has(target)) {
    console.log(`Skipping Google Translate for potentially unsupported language: ${target}`)
    return null
  }

  // Use our server proxy to avoid exposing keys and to count towards Cloud Translation metrics
  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, target }),
    })
    if (!resp.ok) {
      console.log(`Google Translate API failed for ${target}: ${resp.status}`)
      return null
    }
    const data = await resp.json() as { translations?: string[] }
    const translations: string[] = (data?.translations || []).map((t) => htmlUnescape(String(t ?? '')))
    return translations
  } catch (error) {
    console.log(`Google Translate API error for ${target}:`, error)
    return null
  }
}

async function translateWithGemini(texts: string[], targetAppLang: string): Promise<string[] | null> {
  if (!API_KEY) return null
  const langName = getLanguageName(targetAppLang)
  try {
    const results: string[] = []
    // Do sequential to avoid rate limits; can be parallelized if needed.
    for (const text of texts) {
      if (!text) { results.push(text); continue }
      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Translate the following text into ${langName}. Only output the translated text with no quotes or extra commentary.\n\nText:\n${text}`,
              },
            ],
          },
        ],
      }
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!resp.ok) { results.push(text); continue }
      const data = await resp.json()
      const out = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const cleaned = (out || '').trim().replace(/^"|"$/g, '')
      results.push(cleaned || text)
    }
    return results
  } catch {
    return null
  }
}

export async function translateText(text: string, targetAppLang: string): Promise<string> {
  try {
    if (!text) return text
    const target = getGoogleLangCode(targetAppLang)
    if (!target) {
      console.log(`No language code found for: ${targetAppLang}`)
      return text
    }
    // No-op if already English and target is en
    if (target === 'en') return text

    const key = `${target}::${text}`
    const hit = getFromCache(key)
    if (hit) return hit
    
    console.log(`Translating "${text}" to ${targetAppLang} (${target})`)
    
    // Try Google Translate API first
    const google = await translateWithGoogle([text], target)
    if (google && google[0]) {
      console.log(`Google Translate success for ${target}: "${google[0]}"`)
      putInCache(key, google[0])
      return google[0]
    }
    
    // Fallback to Gemini generative translation
    console.log(`Falling back to Gemini for ${targetAppLang}`)
    const gemini = await translateWithGemini([text], targetAppLang)
    if (gemini && gemini[0]) {
      console.log(`Gemini success for ${targetAppLang}: "${gemini[0]}"`)
      putInCache(key, gemini[0])
      return gemini[0]
    }
    
    console.log(`Translation failed for ${targetAppLang}, returning original text`)
    return text
  } catch (error) {
    console.error(`Translation error for ${targetAppLang}:`, error)
    return text
  }
}

export async function translateArray(items: string[], targetAppLang: string): Promise<string[]> {
  const target = getGoogleLangCode(targetAppLang)
  if (!items?.length || !target || target === 'en') return items
  const results: string[] = new Array(items.length)
  const toFetch: { idx: number; text: string }[] = []
  const uniqueMap = new Map<string, number[]>()
  for (let i = 0; i < items.length; i++) {
    const text = items[i] || ''
    const key = `${target}::${text}`
    const hit = getFromCache(key)
    if (hit !== undefined) {
      results[i] = hit
      continue
    }
    // De-duplicate
    const indices = uniqueMap.get(text) || []
    indices.push(i)
    uniqueMap.set(text, indices)
  }
  // Build toFetch from unique, uncached texts
  uniqueMap.forEach((idxs, text) => {
    const key = `${target}::${text}`
    if (getFromCache(key) === undefined) {
      toFetch.push({ idx: idxs[0], text })
    }
  })
  if (toFetch.length === 0) return results

  // Try Google Translate API first (batched)
  const google = await translateWithGoogle(toFetch.map(t => t.text), target)
  if (google && google.length === toFetch.length) {
    google.forEach((tr, i) => {
      const original = toFetch[i]?.text
      const key = `${target}::${original}`
      const val = tr || original
      if (tr) putInCache(key, val)
      // Fill all indices for this original
      const idxs = uniqueMap.get(original) || []
      for (const idx of idxs) results[idx] = val
    })
    for (let i = 0; i < results.length; i++) if (results[i] == null) results[i] = items[i]
    return results
  }

  // Fallback to Gemini (per-item)
  const gemini = await translateWithGemini(toFetch.map(t => t.text), targetAppLang)
  if (gemini && gemini.length === toFetch.length) {
    gemini.forEach((tr, i) => {
      const original = toFetch[i]?.text
      const key = `${target}::${original}`
      const val = tr || original
      if (tr) putInCache(key, val)
      const idxs = uniqueMap.get(original) || []
      for (const idx of idxs) results[idx] = val
    })
    for (let i = 0; i < results.length; i++) if (results[i] == null) results[i] = items[i]
    return results
  }

  // If all fails, return originals
  return items
}

// Debug function to test language support
export async function testLanguageSupport(language: string): Promise<{ supported: boolean; method: string; result?: string; error?: string }> {
  const testText = "Hello, how are you?"
  const target = getGoogleLangCode(language)
  
  if (!target) {
    return { supported: false, method: 'none', error: 'No language code found' }
  }
  
  if (target === 'en') {
    return { supported: true, method: 'none', result: testText }
  }
  
  try {
    // Test Google Translate first
    if (wellSupportedLanguages.has(target)) {
      const google = await translateWithGoogle([testText], target)
      if (google && google[0]) {
        return { supported: true, method: 'google', result: google[0] }
      }
    }
    
    // Test Gemini fallback
    if (API_KEY) {
      const gemini = await translateWithGemini([testText], language)
      if (gemini && gemini[0]) {
        return { supported: true, method: 'gemini', result: gemini[0] }
      }
    }
    
    return { supported: false, method: 'none', error: 'Both Google Translate and Gemini failed' }
  } catch (error) {
    return { supported: false, method: 'none', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
