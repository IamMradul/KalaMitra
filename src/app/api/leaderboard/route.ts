import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// We name the points "MitraPoints" — short code MP
export async function GET(req: Request) {
  try {
    // Aggregate auctions won per user and compute MitraPoints.
    // Simple rule: 10 MP per auction won. (This can be adjusted later.)
    const { data: won } = await supabase
      .from('auctions')
      .select('winner_id')
      .is('winner_id', null)

    // If the above fails or returns nothing, fallback to counting from bids table or return empty.
    // Better approach: query auctions where winner_id is not null and group by winner_id.
    const { data, error } = await supabase
      .from('auctions')
      .select('winner_id, count:wins')
      .not('winner_id', 'is', null)

    // Use SQL via RPC would be better, but keep simple: fetch all auctions with winner_id and aggregate in JS
    const { data: allAuctions } = await supabase.from('auctions').select('winner_id')
    const counts: Record<string, number> = {}
    if (allAuctions && Array.isArray(allAuctions)) {
      for (const a of allAuctions) {
        if (!a.winner_id) continue
        counts[a.winner_id] = (counts[a.winner_id] || 0) + 1
      }
    }

    const winners = Object.entries(counts).map(([user_id, auctionsWon]) => ({ user_id, auctionsWon }))
    // Sort by auctionsWon desc
    winners.sort((a, b) => b.auctionsWon - a.auctionsWon)

    // Fetch profile names for top 20
    const top = winners.slice(0, 20)
    const userIds = top.map(t => t.user_id)
    type Profile = { id: string; name: string; profile_image: string | null };
    let profiles: Profile[] = []
    if (userIds.length) {
      const { data: p } = await supabase.from('profiles').select('id,name,profile_image').in('id', userIds)
      profiles = p || []
    }

    const leaders = top.map(t => {
      const profile = profiles.find(p => p.id === t.user_id)
      const mitraPoints = t.auctionsWon * 10 // 10 MP per win
      return {
        user_id: t.user_id,
        name: profile?.name || null,
        profile_image: profile?.profile_image || null,
        auctionsWon: t.auctionsWon,
        mitraPoints
      }
    })

    return NextResponse.json({ leaders })
  } catch (err) {
    console.error('leaderboard error', err)
    return NextResponse.json({ leaders: [] })
  }
}
