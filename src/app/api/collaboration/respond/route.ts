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

    const timestamp = new Date().toISOString()

    if (action === 'accept') {
      // Accept: update status and create revenue split
      const { data: updatedCollab, error: updateError } = await supabase
        .from('collaborations')
        .update({
          status: 'accepted',
          accepted_at: timestamp
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
      const notificationTitle = 'Collaboration Request Accepted!'
      const notificationBody = `${partnerProfile?.name || 'A seller'} accepted your collaboration request! You can now start working together.`

      await supabase
        .from('notifications')
        .insert({
          user_id: collaboration.initiator_id,
          title: notificationTitle,
          body: notificationBody,
          read: false,
          metadata: {
            type: 'collaboration_accepted',
            collaboration_id: collaborationId,
            partner_id: userId
          }
        })

      // Create default revenue split
      await supabase
        .from('collaboration_revenue_split')
        .insert({
          collaboration_id: collaborationId,
          initiator_percentage: 50.00,
          partner_percentage: 50.00,
          split_method: 'equal'
        })

      return NextResponse.json({
        success: true,
        collaboration: updatedCollab,
        message: 'Collaboration accepted successfully'
      })
    } else {
      // Reject: hard delete the collaboration and related invitation
      // Delete collaboration row
      const { error: deleteError } = await supabase
        .from('collaborations')
        .delete()
        .eq('id', collaborationId)

      if (deleteError) {
        console.error('Error deleting collaboration:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete collaboration', details: deleteError.message },
          { status: 500 }
        )
      }

      // Delete invitation record
      await supabase
        .from('collaboration_invitations')
        .delete()
        .eq('collaboration_id', collaborationId)

      // Optionally, delete notifications related to this collaboration (if needed)
      // await supabase
      //   .from('notifications')
      //   .delete()
      //   .eq('metadata->>collaboration_id', collaborationId)

      // Get partner profile for notification
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single()

      // Send notification to initiator
      const notificationTitle = 'Collaboration Request Declined'
      const notificationBody = `${partnerProfile?.name || 'A seller'} declined your collaboration request.${responseMessage ? ` Reason: "${responseMessage}"` : ''}`

      await supabase
        .from('notifications')
        .insert({
          user_id: collaboration.initiator_id,
          title: notificationTitle,
          body: notificationBody,
          read: false,
          metadata: {
            type: 'collaboration_rejected',
            collaboration_id: collaborationId,
            partner_id: userId
          }
        })

      return NextResponse.json({
        success: true,
        message: 'Collaboration request rejected and deleted'
      })
    }

  } catch (error) {
    console.error('Error in collaboration response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
