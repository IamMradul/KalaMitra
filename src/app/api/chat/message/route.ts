import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { threadId, senderId, content, messageType = 'text' } = await req.json();
    if (!threadId || !senderId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Insert message into chat_messages table
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ thread_id: threadId, sender_id: senderId, content, message_type: messageType })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Mark as read for sender (optional, for completeness)
    await supabase
      .from('chat_message_status')
      .upsert({ message_id: data.id, user_id: senderId, read_at: new Date().toISOString() });
    return NextResponse.json({ message: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
