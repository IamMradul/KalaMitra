import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/collaboration/request
 * Create a new collaboration request
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      initiatorId, 
      partnerId, 
      message, 
      collaborationName,
      collaborationDescription,
      terms 
    } = body

    // Validation
    if (!initiatorId || !partnerId) {
      return NextResponse.json(
        { error: 'Initiator ID and Partner ID are required' },
        { status: 400 }
      )
    }

    if (initiatorId === partnerId) {
      return NextResponse.json(
        { error: 'Cannot collaborate with yourself' },
        { status: 400 }
      )
    }

    // Verify both users are sellers
    const { data: initiator, error: initiatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', initiatorId)
      .single()

    const { data: partner, error: partnerError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', partnerId)
      .single()

    if (initiatorError || partnerError) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      )
    }

    if (initiator.role !== 'seller' || partner.role !== 'seller') {
      return NextResponse.json(
        { error: 'Both users must be sellers to collaborate' },
        { status: 403 }
      )
    }

    // Check for existing collaboration (in either direction)
    const { data: existingCollab } = await supabase
      .from('collaborations')
      .select('id, status')
      .or(`and(initiator_id.eq.${initiatorId},partner_id.eq.${partnerId}),and(initiator_id.eq.${partnerId},partner_id.eq.${initiatorId})`)
      .in('status', ['pending', 'accepted'])
      .maybeSingle()

    if (existingCollab) {
      return NextResponse.json(
        { 
          error: existingCollab.status === 'pending' 
            ? 'A collaboration request already exists between these sellers'
            : 'An active collaboration already exists between these sellers'
        },
        { status: 409 }
      )
    }

    // Create the collaboration request
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .insert({
        initiator_id: initiatorId,
        partner_id: partnerId,
        message: message || null,
        collaboration_name: collaborationName || null,
        collaboration_description: collaborationDescription || null,
        terms: terms || null,
        status: 'pending'
      })
      .select()
      .single()

    if (collabError) {
      console.error('Error creating collaboration:', collabError)
      return NextResponse.json(
        { error: 'Failed to create collaboration request', details: collabError.message },
        { status: 500 }
      )
    }

    // Create invitation record
    await supabase
      .from('collaboration_invitations')
      .insert({
        collaboration_id: collaboration.id
      })

    // Send notification to partner
    const { data: initiatorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', initiatorId)
      .single()

    await supabase
      .from('notifications')
      .insert({
        user_id: partnerId,
        title: 'New Collaboration Request',
        body: `${initiatorProfile?.name || 'A seller'} wants to collaborate with you!${message ? ` Message: "${message}"` : ''}`,
        read: false,
        metadata: {
          type: 'collaboration_request',
          collaboration_id: collaboration.id,
          initiator_id: initiatorId
        }
      })

    return NextResponse.json({
      success: true,
      collaboration
    })

  } catch (error) {
    console.error('Error in collaboration request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
