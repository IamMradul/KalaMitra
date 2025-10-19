import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache on server
const cache = new Map<string, { v: string; t: number }>()
const TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash'

function getTargetFromAppLang(appLang: string): string | null {
  // Accept both canonical and alternate spellings from locale filenames
  const map: Record<string, string> = {
    en: 'en',
    hi: 'hi',
    assamese: 'as',
    bengali: 'bn',
    bodo: 'brx',
    dogri: 'doi',
    gujarati: 'gu',
    kannada: 'kn', kannad: 'kn',
    kashmiri: 'ks',
    konkani: 'gom',
    maithili: 'mai',
    malayalam: 'ml', malyalam: 'ml',
    manipuri: 'mni-Mtei',
    marathi: 'mr',
    nepali: 'ne',
    oriya: 'or',
    punjabi: 'pa',
    sanskrit: 'sa',
    santhali: 'sat',
    sindhi: 'sd',
    tamil: 'ta',
    telugu: 'te', telgu: 'te',
    urdu: 'ur',
  }
  return map[appLang] ?? null
}

// Languages that are well-supported by Google Translate API
const wellSupportedLanguages = new Set([
  'en', 'hi', 'as', 'bn', 'gu', 'kn', 'ks', 'ml', 'mr', 'ne', 'or', 'pa', 'sd', 'ta', 'te', 'ur'
])

// Languages that might not be supported - will fallback to Gemini
const potentiallyUnsupportedLanguages = new Set([
  'brx', 'doi', 'gom', 'mai', 'mni-Mtei', 'sa', 'sat'
])

function getLangName(appLang: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    assamese: 'Assamese',
    bengali: 'Bengali',
    bodo: 'Bodo',
    dogri: 'Dogri',
    gujarati: 'Gujarati',
    kannada: 'Kannada', // fixed typo
    kashmiri: 'Kashmiri',
    konkani: 'Konkani',
    maithili: 'Maithili',
    malayalam: 'Malayalam', // fixed typo
    manipuri: 'Meitei (Manipuri)',
    marathi: 'Marathi',
    nepali: 'Nepali',
    oriya: 'Odia',
    punjabi: 'Punjabi',
    sanskrit: 'Sanskrit',
    santhali: 'Santhali',
    sindhi: 'Sindhi',
    tamil: 'Tamil',
    telugu: 'Telugu', // fixed typo
    urdu: 'Urdu',
  }
  return names[appLang] || appLang
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items: string[] = Array.isArray(body?.q) ? body.q : []
    // Always treat 'target' as an app language key and map it
  const appLang: string = typeof body?.target === 'string' ? body.target : 'en';
  const target: string | null = getTargetFromAppLang(appLang);
  console.log('[TRANSLATE API] appLang:', appLang, 'target (Google code):', target, 'items:', items);
    if (!items.length || !target) {
      return NextResponse.json({ translations: items }, { status: 200 })
    }

    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.TRANSLATE_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    // Serve from cache if possible
    const outputs: string[] = new Array(items.length)
    const toTrans: { idxs: number[]; text: string }[] = []
    const seen = new Map<string, number[]>()
    items.forEach((txt, i) => {
      const key = `${target}::${txt || ''}`
      const c = cache.get(key)
      if (c && Date.now() - c.t < TTL_MS) {
        outputs[i] = c.v
      } else {
        const arr = seen.get(txt) || []
        arr.push(i)
        seen.set(txt, arr)
      }
    })
    seen.forEach((idxs, text) => toTrans.push({ idxs, text }))
    if (toTrans.length === 0) return NextResponse.json({ translations: outputs }, { status: 200 })

    // Try Google Cloud Translation v2 (batched) - skip for potentially unsupported languages
    if (googleKey && wellSupportedLanguages.has(target)) {
      try {
        const resp = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: toTrans.map(t => t.text), target, format: 'text' }),
        })
        if (resp.ok) {
          const data = await resp.json() as { data?: { translations?: Array<{ translatedText?: string }> } }
          console.log('[TRANSLATE API] Google response:', JSON.stringify(data));
          const translations: string[] = (data?.data?.translations || []).map((t) => String(t?.translatedText || ''))
          translations.forEach((tr, i) => {
            const original = toTrans[i]?.text
            const key = `${target}::${original}`
            const val = tr || original
            cache.set(key, { v: val, t: Date.now() })
            for (const idx of toTrans[i].idxs) outputs[idx] = val
          })
          return NextResponse.json({ translations: outputs }, { status: 200 })
        } else {
          console.log(`Google Translate API failed for ${target}: ${resp.status} ${resp.statusText}`)
        }
      } catch (error) {
        console.log(`Google Translate API error for ${target}:`, error)
      }
    } else if (potentiallyUnsupportedLanguages.has(target)) {
      console.log(`Skipping Google Translate for potentially unsupported language: ${target}`)
    }

    // Fallback to Gemini (sequential)
    if (geminiKey) {
      // Use the Google Translate code for Gemini prompt for consistency
      const ln = target || getLangName(appLang);
      for (let i = 0; i < toTrans.length; i++) {
        const text = toTrans[i].text
        try {
          const body = {
            contents: [{ role: 'user', parts: [{ text: `Translate into ${ln}. Only output the translated text.\n\n${text}` }]}],
          }
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          })
          let val = text
          if (resp.ok) {
            const data = await resp.json()
            val = (data?.candidates?.[0]?.content?.parts?.[0]?.text || text).trim().replace(/^"|"$/g, '')
          }
          const key = `${target}::${text}`
          cache.set(key, { v: val, t: Date.now() })
          for (const idx of toTrans[i].idxs) outputs[idx] = val
        } catch {
          for (const idx of toTrans[i].idxs) outputs[idx] = text
        }
      }
      return NextResponse.json({ translations: outputs }, { status: 200 })
    }

    // Nothing configured; return originals
    return NextResponse.json({ translations: items }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
