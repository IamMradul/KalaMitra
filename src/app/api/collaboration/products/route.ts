import { NextResponse } from 'next/server'
import { supabase, Database } from '@/lib/supabase'

type CollaborationRow = Database['public']['Tables']['collaborations']['Row']

/**
 * POST /api/collaboration/products
 * Add a product to a collaboration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      collaborationId, 
      productId, 
      primarySellerId,
      contributionDetails,
      revenueSplitOverride 
    } = body

    // Validation
    if (!collaborationId || !productId || !primarySellerId) {
      return NextResponse.json(
        { error: 'Collaboration ID, Product ID, and Primary Seller ID are required' },
        { status: 400 }
      )
    }

    // Get the collaboration
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('*')
      .eq('id', collaborationId)
      .single()

    if (collabError || !collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found' },
        { status: 404 }
      )
    }

    // Verify collaboration is active
    if (collaboration.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Can only add products to active collaborations' },
        { status: 400 }
      )
    }

    // Verify primary seller is part of the collaboration
    if (collaboration.initiator_id !== primarySellerId && collaboration.partner_id !== primarySellerId) {
      return NextResponse.json(
        { error: 'Primary seller must be part of the collaboration' },
        { status: 403 }
      )
    }

    // Verify product exists and belongs to one of the collaborators
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Product must belong to one of the collaborators
    if (product.seller_id !== collaboration.initiator_id && 
        product.seller_id !== collaboration.partner_id) {
      return NextResponse.json(
        { error: 'Product must belong to one of the collaborators' },
        { status: 403 }
      )
    }

    // Check if product is already in a collaboration
    const { data: existingCollabProduct } = await supabase
      .from('collaborative_products')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle()

    if (existingCollabProduct) {
      return NextResponse.json(
        { error: 'Product is already part of another collaboration' },
        { status: 409 }
      )
    }

    // Add product to collaboration
    const { data: collaborativeProduct, error: insertError } = await supabase
      .from('collaborative_products')
      .insert({
        collaboration_id: collaborationId,
        product_id: productId,
        primary_seller_id: primarySellerId,
        contribution_details: contributionDetails || null,
        revenue_split_override: revenueSplitOverride || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding collaborative product:', insertError)
      return NextResponse.json(
        { error: 'Failed to add product to collaboration', details: insertError.message },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('collaboration_activity')
      .insert({
        collaboration_id: collaborationId,
        actor_id: primarySellerId,
        activity_type: 'product_added',
        activity_data: {
          product_id: productId,
          product_title: product.title
        }
      })

    // Notify the other party
    const otherPartyId = collaboration.initiator_id === primarySellerId 
      ? collaboration.partner_id 
      : collaboration.initiator_id

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', primarySellerId)
      .single()

    await supabase
      .from('notifications')
      .insert({
        user_id: otherPartyId,
        title: 'New Collaborative Product Added',
        body: `${actorProfile?.name || 'Your collaborator'} added "${product.title}" to your collaboration!`,
        read: false,
        metadata: {
          type: 'collaboration_product_added',
          collaboration_id: collaborationId,
          product_id: productId
        }
      })

    return NextResponse.json({
      success: true,
      collaborativeProduct,
      message: 'Product added to collaboration successfully'
    })

  } catch (error) {
    console.error('Error in collaborative products POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collaboration/products?collaborationId=xxx
 * Get all products in a collaboration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const collaborationId = searchParams.get('collaborationId')

    if (!collaborationId) {
      return NextResponse.json(
        { error: 'Collaboration ID is required' },
        { status: 400 }
      )
    }

    // Get collaborative products with full product details
    const { data: collaborativeProducts, error } = await supabase
      .from('collaborative_products')
      .select(`
        *,
        product:products(*),
        primary_seller:profiles!collaborative_products_primary_seller_id_fkey(id, name, profile_image)
      `)
      .eq('collaboration_id', collaborationId)

    if (error) {
      console.error('Error fetching collaborative products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch collaborative products', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      products: collaborativeProducts || [],
      count: collaborativeProducts?.length || 0
    })

  } catch (error) {
    console.error('Error in collaborative products GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collaboration/products?productId=xxx&userId=xxx
 * Remove a product from collaboration
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const userId = searchParams.get('userId')

    if (!productId || !userId) {
      return NextResponse.json(
        { error: 'Product ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get the collaborative product
    const { data: collabProduct, error: fetchError } = await supabase
      .from('collaborative_products')
      .select('*, collaboration:collaborations(*)')
      .eq('product_id', productId)
      .single()

    if (fetchError || !collabProduct) {
      return NextResponse.json(
        { error: 'Collaborative product not found' },
        { status: 404 }
      )
    }

    // Verify user is part of the collaboration
    // Supabase relation joins can come back as an object or an array; normalize to single object
    const rawCollab = collabProduct.collaboration as CollaborationRow | CollaborationRow[] | null
    const collaboration = Array.isArray(rawCollab) ? rawCollab[0] : rawCollab

    if (!collaboration || (collaboration.initiator_id !== userId && collaboration.partner_id !== userId)) {
      return NextResponse.json(
        { error: 'You are not part of this collaboration' },
        { status: 403 }
      )
    }

    // Delete the collaborative product
    const { error: deleteError } = await supabase
      .from('collaborative_products')
      .delete()
      .eq('product_id', productId)

    if (deleteError) {
      console.error('Error removing collaborative product:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove product from collaboration', details: deleteError.message },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('collaboration_activity')
      .insert({
        collaboration_id: collabProduct.collaboration_id,
        actor_id: userId,
        activity_type: 'product_removed',
        activity_data: {
          product_id: productId
        }
      })

    // Notify the other party
    const otherPartyId = collaboration.initiator_id === userId 
      ? collaboration.partner_id 
      : collaboration.initiator_id

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()

    await supabase
      .from('notifications')
      .insert({
        user_id: otherPartyId,
        title: 'Product Removed from Collaboration',
        body: `${actorProfile?.name || 'Your collaborator'} removed a product from your collaboration.`,
        read: false,
        metadata: {
          type: 'collaboration_product_removed',
          collaboration_id: collabProduct.collaboration_id,
          product_id: productId
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Product removed from collaboration successfully'
    })

  } catch (error) {
    console.error('Error in collaborative products DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
