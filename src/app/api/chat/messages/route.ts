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

  // --- OPTIMIZATION 1: Batch mark messages as read ---
  // Instead of individual await Promise.all(upsert), batch all messages not sent by current user
  const otherMessages = (messages || []).filter(msg => msg.sender_id !== currentUserId);
  if (otherMessages.length > 0) {
    const readAt = new Date().toISOString();
    const upserts = otherMessages.map(msg => ({
      message_id: msg.id,
      user_id: currentUserId,
      read_at: readAt
    }));
    
    // Perform a single batch upsert
    await supabase
      .from('chat_message_status')
      .upsert(upserts, { onConflict: 'message_id,user_id' });
  }

  // --- OPTIMIZATION 2: Batch fetch read statuses ---
  // Instead of nested loops (N messages * M participants), we fetch all relevant statuses in one query
  const messageIds = (messages || []).map(m => m.id);
  const otherParticipantIds = (participants || [])
    .map((p: ChatParticipant) => p.user_id)
    .filter(id => id !== currentUserId);

  let statusMap: Record<string, Record<string, boolean>> = {};
  
  if (messageIds.length > 0 && otherParticipantIds.length > 0) {
    const { data: allStatuses } = await supabase
      .from('chat_message_status')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds)
      .in('user_id', otherParticipantIds);

    // Build a lookup map: statusMap[message_id][user_id] = true/false
    allStatuses?.forEach(status => {
      if (!statusMap[status.message_id]) statusMap[status.message_id] = {};
      statusMap[status.message_id][status.user_id] = !!status.read_at;
    });
  }

  // Enrich messages using the cached statusMap
  const messagesWithRead = (messages || []).map(msg => {
    if (msg.sender_id === currentUserId && otherParticipantIds.length > 0) {
      const readByRecipients = otherParticipantIds.map(userId => ({
        user_id: userId,
        read: statusMap[msg.id]?.[userId] || false
      }));
      return { ...msg, readByRecipients };
    }
    return { ...msg };
  });

  return NextResponse.json({ messages: messagesWithRead }, { status: 200 });
}
