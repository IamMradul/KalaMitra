import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/collaboration/search-sellers?userId=xxx&query=xxx
 * Search for sellers to collaborate with
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const query = searchParams.get('query') || ''

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build base query for sellers (excluding current user)
    let sellersQuery = supabase
      .from('profiles')
      .select('id, name, email, profile_image, store_description, bio, created_at')
      .eq('role', 'seller')
      .neq('id', userId)

    // Add search filter if query provided
    if (query) {
      sellersQuery = sellersQuery.or(`name.ilike.%${query}%,store_description.ilike.%${query}%,bio.ilike.%${query}%`)
    }

    const { data: sellers, error: sellersError } = await sellersQuery
      .order('created_at', { ascending: false })
      .limit(20)

    if (sellersError) {
      console.error('Error searching sellers:', sellersError)
      return NextResponse.json(
        { error: 'Failed to search sellers', details: sellersError.message },
        { status: 500 }
      )
    }

    // Get existing collaborations for this user
    const { data: existingCollabs } = await supabase
      .from('collaborations')
      .select('initiator_id, partner_id, status')
      .or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)

    // Enhance seller data with collaboration status and product counts
    const enhancedSellers = await Promise.all(
      (sellers || []).map(async (seller) => {
        // Check collaboration status with this seller
        const existingCollab = existingCollabs?.find(
          c => (c.initiator_id === seller.id || c.partner_id === seller.id)
        )

        // Get seller's product count
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', seller.id)

        // Get collaboration count for this seller
        const { count: collabCount } = await supabase
          .from('collaborations')
          .select('*', { count: 'exact', head: true })
          .or(`initiator_id.eq.${seller.id},partner_id.eq.${seller.id}`)
          .eq('status', 'accepted')

        return {
          ...seller,
          productCount: productCount || 0,
          activeCollaborations: collabCount || 0,
          collaborationStatus: existingCollab 
            ? {
                status: existingCollab.status,
                isInitiator: existingCollab.initiator_id === userId
              }
            : null
        }
      })
    )

    // Filter out sellers with pending or active collaborations
    const availableSellers = enhancedSellers.filter(
      s => !s.collaborationStatus || 
           s.collaborationStatus.status === 'rejected' || 
           s.collaborationStatus.status === 'ended'
    )

    return NextResponse.json({
      success: true,
      sellers: availableSellers,
      total: availableSellers.length,
      allSellers: enhancedSellers // Include all for reference
    })

  } catch (error) {
    console.error('Error in search sellers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
