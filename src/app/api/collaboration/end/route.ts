import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/collaboration/end
 * End an active collaboration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { collaborationId, userId, reason } = body

    // Validation
    if (!collaborationId || !userId) {
      return NextResponse.json(
        { error: 'Collaboration ID and User ID are required' },
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

    // Verify user is part of the collaboration
    if (collaboration.initiator_id !== userId && collaboration.partner_id !== userId) {
      return NextResponse.json(
        { error: 'You are not part of this collaboration' },
        { status: 403 }
      )
    }

    // Check if collaboration can be ended
    if (collaboration.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Only active collaborations can be ended' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // Delete the collaboration record so the unique (initiator_id, partner_id)
    // constraint is freed and the parties can create a new collaboration later.
    const { error: deleteError } = await supabase
      .from('collaborations')
      .delete()
      .eq('id', collaborationId)

    if (deleteError) {
      console.error('Error deleting collaboration:', deleteError)
      return NextResponse.json(
        { error: 'Failed to end collaboration', details: deleteError.message },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('collaboration_activity')
      .insert({
        collaboration_id: collaborationId,
        actor_id: userId,
        activity_type: 'ended',
        activity_data: {
          reason: reason || null,
          ended_at: timestamp
        }
      })

    // Get user profile for notification
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()

    // Notify the other party
    const otherPartyId = collaboration.initiator_id === userId 
      ? collaboration.partner_id 
      : collaboration.initiator_id

    await supabase
      .from('notifications')
      .insert({
        user_id: otherPartyId,
        title: 'Collaboration Ended',
        body: `${userProfile?.name || 'A collaborator'} has ended your collaboration.${reason ? ` Reason: "${reason}"` : ''}`,
        read: false,
        metadata: {
          type: 'collaboration_ended',
          collaboration_id: collaborationId,
          ended_by: userId
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Collaboration ended and removed successfully'
    })

  } catch (error) {
    console.error('Error ending collaboration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collaboration/end?collaborationId=xxx&userId=xxx
 * Cancel a pending collaboration request
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const collaborationId = searchParams.get('collaborationId')
    const userId = searchParams.get('userId')

    if (!collaborationId || !userId) {
      return NextResponse.json(
        { error: 'Collaboration ID and User ID are required' },
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

    // Only initiator can cancel a pending request
    if (collaboration.initiator_id !== userId) {
      return NextResponse.json(
        { error: 'Only the initiator can cancel a pending collaboration request' },
        { status: 403 }
      )
    }

    if (collaboration.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending collaboration requests can be cancelled' },
        { status: 400 }
      )
    }

    // Delete the collaboration and related records (CASCADE will handle the rest)
    const { error: deleteError } = await supabase
      .from('collaborations')
      .delete()
      .eq('id', collaborationId)

    if (deleteError) {
      console.error('Error cancelling collaboration:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cancel collaboration', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Collaboration request cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling collaboration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
