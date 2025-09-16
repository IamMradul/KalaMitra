import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ products: [] })

  // Simple ranking:
  // - views: 1 point
  // - search match by category/title: 2 points
  // - add_to_cart: 3 points (placeholder for future)
  // - purchase: 5 points (placeholder for future)

  try {
    const { data: activities } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()) // last 30 days

    // If there is no activity, return empty recommendations
    if (!activities || activities.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const { data: allProducts } = await supabase
      .from('products')
      .select('*')

    if (!allProducts || allProducts.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const scores = new Map<string, number>()

    // Seed scores from views and searches
    for (const a of activities || []) {
      if (a.activity_type === 'view' && a.product_id) {
        scores.set(a.product_id, (scores.get(a.product_id) || 0) + 1)
      }
      if (a.activity_type === 'search' && a.query) {
        const q = String(a.query).toLowerCase()
        for (const p of allProducts) {
          const title = (p.title || '').toLowerCase()
          const desc = (p.description || '').toLowerCase()
          const cat = (p.category || '').toLowerCase()
          if (title.includes(q) || desc.includes(q) || cat.includes(q)) {
            scores.set(p.id, (scores.get(p.id) || 0) + 2)
          }
        }
      }
    }

    // If after scoring we still have no matches, return empty
    if (scores.size === 0) {
      return NextResponse.json({ products: [] })
    }

    // Rank by score then recency tie-breaker
    const ranked = [...(allProducts as Database['public']['Tables']['products']['Row'][])]
      .filter(p => scores.has(p.id))
      .sort((a, b) => {
        const sa = scores.get(a.id) || 0
        const sb = scores.get(b.id) || 0
        if (sb !== sa) return sb - sa
        return (b.created_at || '').localeCompare(a.created_at || '')
      })
      .slice(0, 12)

    return NextResponse.json({ products: ranked })
  } catch {
    return NextResponse.json({ products: [] })
  }
}


