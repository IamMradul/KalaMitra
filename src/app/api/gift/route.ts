import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
