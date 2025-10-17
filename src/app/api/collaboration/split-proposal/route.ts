import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

// Local type aliases for clarity
type ProposalRow = Database['public']['Tables']['revenue_split_proposals']['Row']
type CollaborationRow = Database['public']['Tables']['collaborations']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

// GET: List all split proposals for a collaboration or product
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const collaborationId = searchParams.get('collaborationId')
    const productId = searchParams.get('productId')
    const status = searchParams.get('status') // pending, approved, rejected, expired

    // First, check if the table exists and has any data
    const { data: testData, error: testError } = await supabase
      .from('revenue_split_proposals')
      .select('id')
      .limit(1)

    // If table doesn't exist yet, return empty array
    if (testError) {
      console.log('Table not found or migration not run yet:', testError.message)
      return NextResponse.json({ proposals: [] })
    }

    // Build query step by step
    let query = supabase
      .from('revenue_split_proposals')
      .select('*')
      .order('created_at', { ascending: false })

    if (collaborationId) {
      query = query.eq('collaboration_id', collaborationId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: proposals, error } = await query

    if (error) {
      console.error('Error in query:', error)
      throw error
    }

    // Fetch additional data for each proposal
    const enrichedProposals = await Promise.all(
      (proposals || []).map(async (proposal) => {
        // Get collaborative product details
        const { data: collabProduct } = await supabase
          .from('collaborative_products')
          .select('id, product_id')
          .eq('id', proposal.collaborative_product_id)
          .single()

        // Get product details if we have the collab product
        let productDetails = null
        if (collabProduct) {
          const { data: product } = await supabase
            .from('products')
            .select('id, title, price, image_url')
            .eq('id', collabProduct.product_id)
            .single()
          productDetails = product
        }

        // Get proposer details
        const { data: proposer } = await supabase
          .from('profiles')
          .select('id, name, profile_image')
          .eq('id', proposal.proposed_by)
          .single()

        // Get responder details if exists
        let responder = null
        if (proposal.responded_by) {
          const { data: responderData } = await supabase
            .from('profiles')
            .select('id, name, profile_image')
            .eq('id', proposal.responded_by)
            .single()
          responder = responderData
        }

        return {
          ...proposal,
          collaborative_products: collabProduct ? {
            ...collabProduct,
            product: productDetails
          } : null,
          proposer,
          responder
        }
      })
    )

    return NextResponse.json({ proposals: enrichedProposals })

  } catch (error: unknown) {
    const msg = getErrorMessage(error)
    console.error('Error fetching split proposals:', msg)
    return NextResponse.json(
      { error: msg || 'Failed to fetch split proposals' },
      { status: 500 }
    )
  }
}

// POST: Create a new split proposal
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      collaborativeProductId, 
      collaborationId, 
      proposedSplit, // { initiator: 60, partner: 40 }
      reason,
      userId // Pass userId from client
    } = body

    // Validate inputs
    if (!collaborativeProductId || !collaborationId || !proposedSplit || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate split adds up to 100
    if (proposedSplit.initiator + proposedSplit.partner !== 100) {
      return NextResponse.json(
        { error: 'Split percentages must add up to 100' },
        { status: 400 }
      )
    }

    // Verify user is part of the collaboration
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('*')
      .eq('id', collaborationId)
      .eq('status', 'accepted')
      .or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)
      .single()

    if (collabError || !collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found or you are not authorized' },
        { status: 403 }
      )
    }

    // Check for existing pending proposal for this product
    const { data: existingProposal } = await supabase
      .from('revenue_split_proposals')
      .select('id')
      .eq('collaborative_product_id', collaborativeProductId)
      .eq('status', 'pending')
      .single()

    if (existingProposal) {
      return NextResponse.json(
        { error: 'There is already a pending proposal for this product. Please wait for it to be resolved.' },
        { status: 400 }
      )
    }

    // Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('revenue_split_proposals')
      .insert({
        collaborative_product_id: collaborativeProductId,
        collaboration_id: collaborationId,
        proposed_by: userId,
        proposed_split: proposedSplit,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single()

    if (proposalError) throw proposalError

    // Log activity
    await supabase
      .from('collaboration_activity')
      .insert({
        collaboration_id: collaborationId,
        actor_id: userId,
        activity_type: 'split_updated',
        activity_data: {
          action: 'proposal_created',
          proposal_id: proposal.id,
          proposed_split: proposedSplit,
          reason
        }
      })

    // Send notification to the other seller
    const partnerId = collaboration.initiator_id === userId 
      ? collaboration.partner_id 
      : collaboration.initiator_id

    await supabase
      .from('notifications')
      .insert({
        user_id: partnerId,
        type: 'split_proposal',
        title: 'New Revenue Split Proposal',
        message: `Your collaboration partner has proposed a new revenue split`,
        link: `/dashboard/seller?tab=collaborations`,
        data: {
          collaboration_id: collaborationId,
          proposal_id: proposal.id,
          proposed_split: proposedSplit
        }
      })

    return NextResponse.json({ 
      success: true, 
      proposal,
      message: 'Split proposal created successfully. Waiting for partner approval.' 
    })

  } catch (error: unknown) {
    const msg = getErrorMessage(error)
    console.error('Error creating split proposal:', msg)
    return NextResponse.json(
      { error: msg || 'Failed to create split proposal' },
      { status: 500 }
    )
  }
}

// PATCH: Respond to a split proposal (approve/reject)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { proposalId, action, userId } = body // action: 'approve' or 'reject', userId from client

    if (!proposalId || !action || !userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    // Get the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('revenue_split_proposals')
      .select(`
        *,
        collaboration:collaborations(*)
      `)
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // Verify user is the partner (not the proposer)
    if (proposal.proposed_by === userId) {
      return NextResponse.json(
        { error: 'You cannot respond to your own proposal' },
        { status: 403 }
      )
    }

    // Verify user is part of the collaboration
    const collaboration = proposal.collaboration as CollaborationRow | null
    if (!collaboration || (collaboration.initiator_id !== userId && collaboration.partner_id !== userId)) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this proposal' },
        { status: 403 }
      )
    }

    // Verify proposal is still pending
    if (proposal.status !== 'pending') {
      return NextResponse.json(
        { error: `This proposal has already been ${proposal.status}` },
        { status: 400 }
      )
    }

    // Update the proposal
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: updateError } = await supabase
      .from('revenue_split_proposals')
      .update({
        status: newStatus,
        responded_by: userId,
        responded_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    if (updateError) throw updateError

    // Log activity
    await supabase
      .from('collaboration_activity')
      .insert({
        collaboration_id: proposal.collaboration_id,
        actor_id: userId,
        activity_type: 'split_updated',
        activity_data: {
          action: `proposal_${action}d`,
          proposal_id: proposalId,
          proposed_split: proposal.proposed_split
        }
      })

    // Send notification to proposer
    await supabase
      .from('notifications')
      .insert({
        user_id: proposal.proposed_by,
        type: 'split_proposal_response',
        title: `Split Proposal ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your revenue split proposal has been ${action}d`,
        link: `/dashboard/seller?tab=collaborations`,
        data: {
          collaboration_id: proposal.collaboration_id,
          proposal_id: proposalId,
          action: newStatus
        }
      })

    return NextResponse.json({ 
      success: true, 
      message: `Proposal ${action}d successfully`,
      status: newStatus
    })

  } catch (error: unknown) {
    const msg = getErrorMessage(error)
    console.error('Error responding to split proposal:', msg)
    return NextResponse.json(
      { error: msg || 'Failed to respond to proposal' },
      { status: 500 }
    )
  }
}
