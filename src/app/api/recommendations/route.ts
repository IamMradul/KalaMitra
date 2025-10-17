import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ products: [] })

  try {
    // Get recent activity (last 30 days)
    const { data: activities } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())

    // Get all products
    const { data: allProducts } = await supabase
      .from('products')
      .select('*')

    if (!allProducts || allProducts.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const scores = new Map<string, number>()
    const viewedProductIds = new Set<string>()
    const viewedCategories = new Set<string>()

    // If no recent activity, try to use long-term preferences
    if (!activities || activities.length === 0) {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (preferences && preferences.favorite_categories) {
        // Boost products in user's favorite categories
        const favCats = new Set(
          (preferences.favorite_categories as Array<{ category: string; count: number }>)
            .map(c => c.category)
        )
        for (const p of allProducts) {
          if (p.category && favCats.has(p.category)) {
            scores.set(p.id, (scores.get(p.id) || 0) + 3)
          }
        }
      }

      if (scores.size === 0) {
        return NextResponse.json({ products: [] })
      }
    } else {
      // Process recent activity
      for (const a of activities) {
        if (a.activity_type === 'view' && a.product_id) {
          viewedProductIds.add(a.product_id)
          // Track categories of viewed products
          const product = allProducts.find(p => p.id === a.product_id)
          if (product?.category) {
            viewedCategories.add(product.category)
          }
        }
        
        if (a.activity_type === 'search' && a.query) {
          const q = String(a.query).toLowerCase()
          for (const p of allProducts) {
            // Skip products user has already viewed
            if (viewedProductIds.has(p.id)) continue
            
            const title = (p.title || '').toLowerCase()
            const desc = (p.description || '').toLowerCase()
            const cat = (p.category || '').toLowerCase()
            if (title.includes(q) || desc.includes(q) || cat.includes(q)) {
              scores.set(p.id, (scores.get(p.id) || 0) + 2)
            }
          }
        }
      }

      // Category-based recommendations: boost products in categories user has viewed
      if (viewedCategories.size > 0) {
        for (const p of allProducts) {
          // Skip products user has already viewed
          if (viewedProductIds.has(p.id)) continue
          
          if (p.category && viewedCategories.has(p.category)) {
            scores.set(p.id, (scores.get(p.id) || 0) + 3)
          }
        }
      }

      if (scores.size === 0) {
        return NextResponse.json({ products: [] })
      }
    }

    // Rank by score then recency tie-breaker
    const ranked = [...(allProducts as Database['public']['Tables']['products']['Row'][])]
      .filter(p => scores.has(p.id) && !viewedProductIds.has(p.id)) // Exclude already viewed
      .sort((a, b) => {
        const sa = scores.get(a.id) || 0
        const sb = scores.get(b.id) || 0
        if (sb !== sa) return sb - sa
        return (b.created_at || '').localeCompare(a.created_at || '')
      })
      .slice(0, 12)

    return NextResponse.json({ products: ranked })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json({ products: [] })
  }
}


