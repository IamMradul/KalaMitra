import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const [receivedResult, sentResult, groupResult] = await Promise.all([
      supabase
        .from('gifts')
        .select('id, product_id, sender_id, recipient_id, message, created_at, status, viewed, metadata')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('gifts')
        .select('id, product_id, sender_id, recipient_id, message, created_at, status, viewed, metadata')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('group_gifts')
        .select('id, product_id, recipient_id, initiator_id, message, created_at, target_amount, member_ids')
        .or(`initiator_id.eq.${userId},member_ids.cs.{${userId}}`)
        .not('recipient_id', 'eq', userId),
    ]);

    if (receivedResult.error) throw receivedResult.error;
    if (sentResult.error) throw sentResult.error;
    if (groupResult.error) throw groupResult.error;

    return NextResponse.json({
      received: receivedResult.data || [],
      sent: sentResult.data || [],
      group: groupResult.data || []
    });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { product_id, recipient_id, message, user_id } = await req.json();
    // user_id and recipient_id must be profile IDs
    console.log('Gift API request:', { product_id, recipient_id, message, user_id });
    if (!user_id) {
      return NextResponse.json({ error: 'Sender profile ID required' }, { status: 401 });
    }
    if (recipient_id === user_id) {
      return NextResponse.json({ error: 'You cannot gift to yourself.' }, { status: 400 });
    }
    if (!product_id || !recipient_id) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    // Fetch product details for notification
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('id, title')
      .eq('id', product_id)
      .single();
    if (prodError || !product) {
      return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
    }
    // Fetch sender profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', user_id)
      .single();
    // Create gift
    const { data: gift, error: giftError } = await supabase
      .from('gifts')
      .insert({
        product_id,
        sender_id: user_id,
        recipient_id,
        message: message || '',
        status: 'sent',
      })
      .select('*')
      .single();
    console.log('Gift creation result:', { gift, giftError });
    if (giftError) {
      console.error('Gift creation failed:', giftError);
      return NextResponse.json({ error: 'Gift creation failed.' }, { status: 500 });
    }
    // Log notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipient_id,
        title: 'You received a gift!',
        body: `${senderProfile?.name || 'Someone'} sent you "${product.title}" as a gift!`,
        read: false,
        metadata: {
          type: 'gift_received',
          gift_id: gift.id,
          product_id: product.id,
          sender_id: user_id
        }
      });
    return NextResponse.json({ gift });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, recipient_id, viewed } = await req.json();

    if (!id || !recipient_id || viewed === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase.from('gifts').update({ viewed }).eq('id', id).eq('recipient_id', recipient_id);

    if (error) {
      console.error('Failed to update gift:', error);
      return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
