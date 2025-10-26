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
  // Get thread details
  const { data: threadsRaw, error: threadError } = await supabase
    .from('chat_threads')
    .select('*')
    .in('id', threadIds);
  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  // For each thread, fetch participants and last message
  type ThreadRow = {
    id: string;
    type: string;
    title?: string;
    created_at?: string;
    // ...other fields
  };
  type ParticipantRow = { user_id: string };
  const threads = await Promise.all(threadsRaw.map(async (thread: ThreadRow) => {
    // Participants
    const { data: participantRows } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('thread_id', thread.id);
    const participantIds = participantRows?.map((row: ParticipantRow) => row.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, profile_image')
      .in('id', participantIds);
    // Last message
    const { data: lastMsgRows } = await supabase
      .from('chat_messages')
      .select('id, content, created_at, sender_id')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const lastMessage = lastMsgRows?.[0] || null;
    return {
      ...thread,
      participants: profiles || [],
      lastMessage,
    };
  }));
  return NextResponse.json({ threads }, { status: 200 });
}
