import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId');
  const limit = Number(searchParams.get('limit') || 50);
  const order = searchParams.get('order') === 'asc' ? true : false;
  const currentUserId = searchParams.get('userId'); // Pass this from frontend
  const before = searchParams.get('before');
  if (!threadId || !currentUserId) {
    return NextResponse.json({ error: 'Missing threadId or userId' }, { status: 400 });
  }
  // Get all participants
  type ChatParticipant = { user_id: string };
  const { data: participants } = await supabase
    .from('chat_participants')
    .select('user_id')
    .eq('thread_id', threadId);
  const otherUserId = participants?.find((p: ChatParticipant) => p.user_id !== currentUserId)?.user_id;

  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: order })
    .limit(limit);
  if (before) {
    query = query.lt('created_at', before);
  }
  const { data: messages, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark messages as read for the current user (for messages not sent by them)
  await Promise.all(messages.map(async msg => {
    if (msg.sender_id !== currentUserId) {
      await supabase
        .from('chat_message_status')
        .upsert({ message_id: msg.id, user_id: currentUserId, read_at: new Date().toISOString() });
    }
  }));

  // Attach readByRecipients for each message sent by current user (group chat support)
  const messagesWithRead = await Promise.all(messages.map(async msg => {
    if (msg.sender_id === currentUserId && participants) {
      // For each other participant, get read status
      const readByRecipients = await Promise.all(
        (participants as ChatParticipant[])
          .filter((p) => p.user_id !== currentUserId)
          .map(async (p) => {
            const { data: status } = await supabase
              .from('chat_message_status')
              .select('read_at')
              .eq('message_id', msg.id)
              .eq('user_id', p.user_id)
              .single();
            return { user_id: p.user_id, read: !!(status && status.read_at) };
          })
      );
      return { ...msg, readByRecipients };
    }
    return { ...msg };
  }));

  return NextResponse.json({ messages: messagesWithRead }, { status: 200 });
}
