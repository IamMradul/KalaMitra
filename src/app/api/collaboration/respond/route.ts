import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/collaboration/respond
 * Accept or reject a collaboration request
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      collaborationId, 
      userId, 
      action, // 'accept' or 'reject'
      responseMessage 
    } = body

    // Validation
    if (!collaborationId || !userId || !action) {
      return NextResponse.json(
        { error: 'Collaboration ID, User ID, and action are required' },
        { status: 400 }
      )
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "reject"' },
        { status: 400 }
      )
    }

    // Get the collaboration
    const { data: collaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('*')
      .eq('id', collaborationId)
      .single()

    if (fetchError || !collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found' },
        { status: 404 }
      )
    }

    // Verify user is the partner (receiver of the request)
    if (collaboration.partner_id !== userId) {
      return NextResponse.json(
        { error: 'Only the collaboration partner can respond to this request' },
        { status: 403 }
      )
    }

    // Check if already responded
    if (collaboration.status !== 'pending') {
      return NextResponse.json(
        { error: `This collaboration request has already been ${collaboration.status}` },
        { status: 400 }
      )
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    const timestamp = new Date().toISOString()

    // Update collaboration status
    const { data: updatedCollab, error: updateError } = await supabase
      .from('collaborations')
      .update({
        status: newStatus,
        accepted_at: action === 'accept' ? timestamp : null
      })
      .eq('id', collaborationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating collaboration:', updateError)
      return NextResponse.json(
        { error: 'Failed to update collaboration', details: updateError.message },
        { status: 500 }
      )
    }

    // Update invitation record
    await supabase
      .from('collaboration_invitations')
      .update({
        responded_at: timestamp,
        response_message: responseMessage || null
      })
      .eq('collaboration_id', collaborationId)

    // Get partner profile for notification
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()

    // Send notification to initiator
    const notificationTitle = action === 'accept' 
      ? 'Collaboration Request Accepted!' 
      : 'Collaboration Request Declined'
    
    const notificationBody = action === 'accept'
      ? `${partnerProfile?.name || 'A seller'} accepted your collaboration request! You can now start working together.`
      : `${partnerProfile?.name || 'A seller'} declined your collaboration request.${responseMessage ? ` Reason: "${responseMessage}"` : ''}`

    await supabase
      .from('notifications')
      .insert({
        user_id: collaboration.initiator_id,
        title: notificationTitle,
        body: notificationBody,
        read: false,
        metadata: {
          type: `collaboration_${action}ed`,
          collaboration_id: collaborationId,
          partner_id: userId
        }
      })

    // If accepted, create default revenue split
    if (action === 'accept') {
      await supabase
        .from('collaboration_revenue_split')
        .insert({
          collaboration_id: collaborationId,
          initiator_percentage: 50.00,
          partner_percentage: 50.00,
          split_method: 'equal'
        })
    }

    return NextResponse.json({
      success: true,
      collaboration: updatedCollab,
      message: `Collaboration ${action}ed successfully`
    })

  } catch (error) {
    console.error('Error in collaboration response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
