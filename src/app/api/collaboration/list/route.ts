import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/collaboration/list?userId=xxx&status=pending|accepted|all
 * List collaborations for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const statusFilter = searchParams.get('status') || 'all'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user is a seller
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userProfile.role !== 'seller') {
      return NextResponse.json(
        { error: 'Only sellers can have collaborations' },
        { status: 403 }
      )
    }

    // Build query to get collaborations where user is either initiator or partner
    let query = supabase
      .from('collaborations')
      .select(`
        *,
        initiator:profiles!collaborations_initiator_id_fkey(id, name, email, profile_image, store_description),
        partner:profiles!collaborations_partner_id_fkey(id, name, email, profile_image, store_description)
      `)
      .or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    const { data: collaborations, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching collaborations:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch collaborations', details: fetchError.message },
        { status: 500 }
      )
    }

    // Enhance collaborations with additional info
    const enhancedCollaborations = await Promise.all(
      (collaborations || []).map(async (collab) => {
        // Get revenue split if accepted
        let revenueSplit = null
        if (collab.status === 'accepted') {
          const { data: split } = await supabase
            .from('collaboration_revenue_split')
            .select('*')
            .eq('collaboration_id', collab.id)
            .single()
          revenueSplit = split
        }

        // Get product count
        const { count: productCount } = await supabase
          .from('collaborative_products')
          .select('*', { count: 'exact', head: true })
          .eq('collaboration_id', collab.id)

        // Determine if current user is initiator or partner
        const isInitiator = collab.initiator_id === userId
        const partnerInfo = isInitiator ? collab.partner : collab.initiator

        return {
          ...collab,
          isInitiator,
          partnerInfo,
          revenueSplit,
          productCount: productCount || 0
        }
      })
    )

    // Separate into categories
    const pending = enhancedCollaborations.filter(c => c.status === 'pending')
    const active = enhancedCollaborations.filter(c => c.status === 'accepted')
    const inactive = enhancedCollaborations.filter(c => ['rejected', 'ended', 'cancelled'].includes(c.status))

    // Separate pending into sent and received
    const pendingSent = pending.filter(c => c.isInitiator)
    const pendingReceived = pending.filter(c => !c.isInitiator)

    return NextResponse.json({
      success: true,
      collaborations: enhancedCollaborations,
      summary: {
        total: enhancedCollaborations.length,
        pending: pending.length,
        pendingSent: pendingSent.length,
        pendingReceived: pendingReceived.length,
        active: active.length,
        inactive: inactive.length
      },
      categorized: {
        pendingSent,
        pendingReceived,
        active,
        inactive
      }
    })

  } catch (error) {
    console.error('Error in collaboration list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
