import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  // This endpoint supports both DM and group threads. No changes needed for group chat support.
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  // Get threads where user is a participant
  const { data: participantRows, error: participantError } = await supabase
    .from('chat_participants')
    .select('thread_id')
    .eq('user_id', userId);
  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 500 });
  }
  type ChatParticipant = { thread_id: string };
  const threadIds = participantRows?.map((row: ChatParticipant) => row.thread_id) || [];
  if (threadIds.length === 0) {
    return NextResponse.json({ threads: [] }, { status: 200 });
  }
  
  // --- BATCH OPTIMIZATION: Fetch all thread details, participants, and last messages in one go ---
  
  // 1. Get thread basic info
  const { data: threadsRaw, error: threadError } = await supabase
    .from('chat_threads')
    .select('*')
    .in('id', threadIds);

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  // 2. Batch fetch ALL participants for ALL threads
  const { data: allParticipantsData } = await supabase
    .from('chat_participants')
    .select('thread_id, user_id')
    .in('thread_id', threadIds);

  const allParticipantIds = Array.from(new Set(allParticipantsData?.map(p => p.user_id) || []));

  // 3. Batch fetch ALL relevant profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, name, profile_image')
    .in('id', allParticipantIds);

  const profileMap = Object.fromEntries(allProfiles?.map(p => [p.id, p]) || []);

  // 4. Batch fetch LAST messages for all threads
  // Note: Standard Supabase order/limit applies to the whole result. 
  // For "last message per thread", a custom SQL/RPC is often better, 
  // but for small thread counts, we can use a clever query or just fetch newest messages for these threads.
  const { data: lastMessagesData } = await supabase
    .from('chat_messages')
    .select('id, thread_id, content, created_at, sender_id')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  // Map thread_id -> newest message manually since Supabase .in() + .limit(1) doesn't do "limit per grouping"
  const lastMsgMap: Record<string, any> = {};
  lastMessagesData?.forEach(msg => {
    if (!lastMsgMap[msg.thread_id]) {
      lastMsgMap[msg.thread_id] = msg;
    }
  });

  // Construct final threads array
  const threads = (threadsRaw || []).map(thread => {
    const threadParticipants = allParticipantsData
      ?.filter(p => p.thread_id === thread.id)
      .map(p => profileMap[p.user_id])
      .filter(Boolean) || [];

    return {
      ...thread,
      participants: threadParticipants,
      lastMessage: lastMsgMap[thread.id] || null
    };
  });

  return NextResponse.json({ threads }, { status: 200 });
}
