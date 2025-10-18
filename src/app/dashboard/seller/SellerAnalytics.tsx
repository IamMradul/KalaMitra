'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AIService, { type SellerAnalyticsSnapshot } from '@/lib/ai-service'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/components/LanguageProvider'
import { translateArray, translateText } from '@/lib/translate'

type Props = { sellerId: string }

export default function SellerAnalytics({ sellerId }: Props) {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [totalViews, setTotalViews] = useState(0)
  const [uniqueVisitors, setUniqueVisitors] = useState(0)
  const [topProducts, setTopProducts] = useState<{ id: string; title: string; views: number }[]>([])
  const [guidance, setGuidance] = useState<string>('')
  const [rawGuidance, setRawGuidance] = useState<string>('')
  const [qaLoading, setQaLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [quotaCooldownUntil, setQuotaCooldownUntil] = useState<number>(0)
  
  // Collaboration stats
  const [collabStats, setCollabStats] = useState({
    activeCollaborations: 0,
    collaborativeProducts: 0,
    collaborativeRevenue: 0
  })

  const toBullets = (text: string): string[] => {
    if (!text) return []
    let t = text.replace(/\r\n/g, '\n')
    // Normalize inline bullets like " * " into newlines
    t = t.replace(/\s\*\s/g, '\n- ')
    // Split by common bullet starters
    const parts = t.split(/\n+|^[-*]\s+/gm)
      .map(s => s.replace(/^[-*]\s+/, '').trim())
      .map(s => s.replace(/\*\*([^*]+)\*\*/g, '$1')) // remove **bold** markers
      .map(s => s.replace(/\*/g, '')) // remove stray asterisks
      .map(s => s.replace(/`+/g, '')) // remove backticks
      .filter(Boolean)
    // If everything collapsed to one long sentence, return it as a single item
    if (parts.length <= 1) return parts
    return parts
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()

        // Stall views
        const { data: stallViews } = await supabase
          .from('user_activity')
          .select('user_id')
          .eq('stall_id', sellerId)
          .gte('timestamp', since)

        setTotalViews(stallViews?.length || 0)
        setUniqueVisitors(new Set((stallViews || []).map(r => r.user_id)).size)

        // Top products by views
        const { data: prodViews } = await supabase
          .from('user_activity')
          .select('product_id')
          .gte('timestamp', since)

        const { data: sellerProducts } = await supabase
          .from('products')
          .select('id,title')
          .eq('seller_id', sellerId)

        const pset = new Set((sellerProducts || []).map(p => p.id))
        const counts = new Map<string, number>()
        for (const r of prodViews || []) {
          const pid = r.product_id as string | null
          if (pid && pset.has(pid)) {
            counts.set(pid, (counts.get(pid) || 0) + 1)
          }
        }
        let top = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, views]) => ({ id, views, title: (sellerProducts || []).find(p => p.id === id)?.title || 'Untitled' }))
        // Translate top product titles for display
        try {
          const lang = currentLanguage
          const titles = top.map(t => t.title)
          const tr = await translateArray(titles, lang)
          top = top.map((p, idx) => ({ ...p, title: tr[idx] || p.title }))
        } catch {}
        setTopProducts(top)

        // Fetch collaboration statistics
        try {
          const { data: collaborations } = await supabase
            .from('collaborations')
            .select('*')
            .or(`initiator_id.eq.${sellerId},partner_id.eq.${sellerId}`)
            .eq('status', 'accepted')

          // Safer: count collaborative_products by collaboration_id using IN (...) to avoid join/filter edge cases
          let collabProductsCount = 0
          try {
            const collaborationIds = (collaborations || []).map((c) => c.id).filter(Boolean)
            if (collaborationIds.length > 0) {
              const { data: collabProducts } = await supabase
                .from('collaborative_products')
                .select('id')
                .in('collaboration_id', collaborationIds)

              collabProductsCount = collabProducts?.length || 0
            }
          } catch (innerErr) {
            console.error('Error fetching collaborative products count:', innerErr)
          }

          setCollabStats({
            activeCollaborations: collaborations?.length || 0,
            collaborativeProducts: collabProductsCount,
            collaborativeRevenue: 0 // Placeholder for future revenue tracking
          })
        } catch (err) {
          console.error('Error fetching collaboration stats:', err)
        }

        // AI Tips (fallback to rules if API fails)
        try {
          const ai = AIService.getInstance()
          const tips = await ai.generateSellerTips({
            totalViews,
            uniqueVisitors,
            topProducts: top.map(t => ({ title: t.title, views: t.views }))
          })
          // Save raw guidance and translate for display
          setRawGuidance(tips)
          // Translate AI tips text
          try {
            const tr = await translateText(tips, currentLanguage)
            setGuidance(tr)
          } catch {
            setGuidance(tips)
          }
        } catch {
          if (top.length > 0) {
            const topTitles = top.map(t => t.title).join(', ')
            setGuidance(t('seller.analyticsGuidance.audienceEngagingMost', { titles: topTitles }))
          } else if (totalViews === 0) {
            setGuidance(t('seller.analyticsGuidance.noRecentVisits'))
          } else {
            setGuidance(t('seller.analyticsGuidance.viewsStarting'))
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sellerId])

  // Re-translate cached guidance when language changes to avoid re-calling AI
  useEffect(() => {
    const run = async () => {
      if (!rawGuidance) return
      try {
        const tr = await translateText(rawGuidance, currentLanguage)
        setGuidance(tr)
      } catch {
        setGuidance(rawGuidance)
      }
    }
    run()
  }, [currentLanguage, rawGuidance])

  if (loading) {
  return <div className="text-[var(--muted)]">{t('seller.analyticsShort.loading')}</div>
  }

  return (
    <div className="space-y-6">
      {/* Main Analytics Grid - Modern Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="rounded-2xl shadow-lg border border-orange-200 dark:border-[var(--border)] bg-gradient-to-br from-orange-50/80 via-yellow-100/80 to-white/70 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-black/40 backdrop-blur-md bg-opacity-70 p-6 flex flex-col items-center justify-center">
          <div className="mb-2 text-3xl sm:text-4xl text-orange-600 dark:text-orange-400 font-extrabold flex items-center gap-2">
            <span>👁️</span>
            {totalViews}
          </div>
          <div className="text-sm sm:text-base text-[var(--muted)] font-medium tracking-wide">{t('seller.analyticsShort.stallViews30d')}</div>
        </div>
  <div className="rounded-2xl shadow-lg border border-yellow-200 dark:border-[var(--border)] bg-gradient-to-br from-yellow-50/80 via-orange-100/80 to-white/70 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-black/40 backdrop-blur-md bg-opacity-70 p-6 flex flex-col items-center justify-center">
          <div className="mb-2 text-3xl sm:text-4xl text-yellow-600 dark:text-yellow-400 font-extrabold flex items-center gap-2">
            <span>🧑‍🤝‍🧑</span>
            {uniqueVisitors}
          </div>
          <div className="text-sm sm:text-base text-[var(--muted)] font-medium tracking-wide">{t('seller.analyticsShort.uniqueVisitors30d')}</div>
        </div>
  <div className="rounded-2xl shadow-lg border border-orange-100 dark:border-[var(--border)] bg-gradient-to-br from-orange-100/80 via-yellow-50/80 to-white/70 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-black/40 backdrop-blur-md bg-opacity-70 p-6 flex flex-col">
          <div className="mb-2 text-lg sm:text-xl font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <span>🏆</span>
            {t('seller.analyticsShort.topProducts30d')}
          </div>
          {topProducts.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">{t('seller.analyticsShort.noProductViewsYet')}</div>
          ) : (
            <ul className="space-y-1">
              {topProducts.map(p => (
                <li key={p.id} className="flex justify-between text-sm text-[var(--muted)]">
                  <span className="truncate mr-2 text-[var(--text)] font-medium">{p.title}</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{p.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Collaboration Stats - Modern Card with Bar */}
      {collabStats.activeCollaborations > 0 && (
  <div className="rounded-2xl shadow-xl border border-yellow-200 dark:border-yellow-900 bg-gradient-to-br from-yellow-100/80 via-orange-50/80 to-white/70 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-black/40 backdrop-blur-md bg-opacity-70 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl sm:text-4xl">🤝</span>
            <h3 className="text-lg sm:text-2xl font-bold text-yellow-700 dark:text-yellow-400 tracking-wide">
              {t('collaboration.title')}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm text-[var(--muted)] mb-1">Active Collaborations</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-yellow-600 dark:text-yellow-400">
                {collabStats.activeCollaborations}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm text-[var(--muted)] mb-1">Collaborative Products</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                {collabStats.collaborativeProducts}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm text-[var(--muted)] mb-1">Partnership Impact</div>
              <div className="w-full flex flex-col items-center">
                {collabStats.collaborativeProducts > 0 ? (
                  <>
                    <div className="w-full h-3 rounded-full bg-yellow-200 dark:bg-yellow-900/30 overflow-hidden mt-2">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-yellow-500 dark:from-orange-600 dark:to-yellow-400 transition-all duration-700"
                        style={{ width: `${Math.round((collabStats.collaborativeProducts / (topProducts.length + collabStats.collaborativeProducts)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mt-2 font-semibold">
                      {`${Math.round((collabStats.collaborativeProducts / (topProducts.length + collabStats.collaborativeProducts)) * 100)}% of portfolio`}
                    </div>
                  </>
                ) : (
                  <div className="text-xs sm:text-sm text-[var(--muted)] mt-2">Just getting started</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tips Section - Modern Card */}
  <div className="rounded-2xl shadow-lg border border-orange-200 dark:border-[var(--border)] bg-gradient-to-br from-orange-50/80 via-yellow-100/80 to-white/70 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-black/40 backdrop-blur-md bg-opacity-70 p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl sm:text-3xl text-orange-600 dark:text-orange-400">💡</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">{t('seller.analyticsShort.tipsTitle')}</div>
            {toBullets(guidance).length > 1 ? (
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text)]">
                {toBullets(guidance).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-[var(--text)] leading-relaxed">{guidance}</div>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-orange-100 dark:border-[var(--border)]">
          <div className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">{t('seller.analyticsShort.askMoreTips')}</div>
          <div className="flex flex-col xs:flex-row gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('seller.analyticsShort.askPlaceholder')}
              className="flex-1 px-3 py-2 text-base rounded-lg focus:outline-none bg-[var(--bg-2)] border-orange-100 dark:border-[var(--border)] text-[var(--text)]"
            />
            <button
              disabled={qaLoading || !question.trim()}
              onClick={async () => {
                try {
                  // Simple cooldown after quota errors
                  if (Date.now() < quotaCooldownUntil) {
                    setAnswer(t('seller.analyticsShort.limitReached', { defaultValue: 'AI limit reached. Please try again later.' }))
                    return
                  }
                  setQaLoading(true)
                  const ai = AIService.getInstance()
                  const snapshot: SellerAnalyticsSnapshot = {
                    totalViews,
                    uniqueVisitors,
                    topProducts: topProducts.map(t => ({ title: t.title, views: t.views }))
                  }
                  try {
                    const tips = await ai.answerSellerQuestion(snapshot, question)
                    // Translate Q&A answer
                    try {
                      const tr = await translateText(tips, currentLanguage)
                      setAnswer(tr)
                    } catch {
                      setAnswer(tips)
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err ?? '')
                    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
                      setQuotaCooldownUntil(Date.now() + 60_000)
                      setAnswer(t('seller.analyticsShort.limitReached', { defaultValue: 'Daily AI limit reached. Please try again later.' }))
                    } else {
                      setAnswer(t('common.error', { defaultValue: 'Something went wrong. Please try again.' }))
                    }
                  }
                } finally {
                  setQaLoading(false)
                }
              }}
              className="px-4 py-2 text-base bg-orange-600 dark:bg-orange-400 text-white rounded-lg disabled:opacity-50 hover:bg-orange-700 dark:hover:bg-orange-500 transition-colors whitespace-nowrap font-semibold"
            >
              {qaLoading ? t('seller.analyticsShort.thinking') : t('seller.analyticsShort.askButton')}
            </button>
          </div>
          {answer && (
            toBullets(answer).length > 1 ? (
              <ul className="mt-4 list-disc list-inside space-y-1 text-sm text-[var(--text)]">
                {toBullets(answer).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 text-sm text-[var(--text)] whitespace-pre-wrap">{answer}</div>
            )
          )}
        </div>
      </div>
    </div>
  )
}


