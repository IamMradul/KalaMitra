import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userA = searchParams.get('userA');
    const userB = searchParams.get('userB');
    if (!userA || !userB) {
      return NextResponse.json({ error: 'Missing userA or userB' }, { status: 400 });
    }
    // Find all DM threads for each user
    const { data: userThreadsA, error: errA } = await supabase
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', userA);
    const { data: userThreadsB, error: errB } = await supabase
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', userB);
    if (errA || errB) return NextResponse.json({ error: errA?.message || errB?.message }, { status: 500 });
  // Find intersection
  type ChatParticipant = { thread_id: string };
  const threadIdsA = userThreadsA.map((t: ChatParticipant) => t.thread_id);
  const threadIdsB = userThreadsB.map((t: ChatParticipant) => t.thread_id);
  const commonThreadIds = threadIdsA.filter((id: string) => threadIdsB.includes(id));
    if (commonThreadIds.length > 0) {
      // Check if any of these threads is a DM
      const { data: threads, error: threadError } = await supabase
        .from('chat_threads')
        .select('id')
        .in('id', commonThreadIds)
        .eq('type', 'dm');
      if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 });
      if (threads && threads.length > 0) {
        return NextResponse.json({ threadId: threads[0].id }, { status: 200 });
      }
    }
    return NextResponse.json({ threadId: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const { participantIds, title } = await req.json();
    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return NextResponse.json({ error: 'Thread must have at least 2 participants' }, { status: 400 });
    }
  const threadType = participantIds.length === 2 ? 'dm' : 'group';
    // For DM, check if thread already exists
    if (threadType === 'dm') {
      const { data: userThreadsA, error: errA } = await supabase
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', participantIds[0]);
      const { data: userThreadsB, error: errB } = await supabase
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', participantIds[1]);
      if (errA || errB) return NextResponse.json({ error: errA?.message || errB?.message }, { status: 500 });
  type ChatParticipant = { thread_id: string };
  const threadIdsA = userThreadsA.map((t: ChatParticipant) => t.thread_id);
  const threadIdsB = userThreadsB.map((t: ChatParticipant) => t.thread_id);
  const commonThreadIds = threadIdsA.filter((id: string) => threadIdsB.includes(id));
      if (commonThreadIds.length > 0) {
        const { data: threads, error: threadError } = await supabase
          .from('chat_threads')
          .select('id')
          .in('id', commonThreadIds)
          .eq('type', 'dm');
        if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 });
        if (threads && threads.length > 0) {
          return NextResponse.json({ threadId: threads[0].id }, { status: 200 });
        }
      }
    }
    // Create new thread (DM or group)
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .insert([{ type: threadType, title: threadType === 'group' ? title || null : null }])
      .select()
      .single();
    if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 });
    // Add participants
    const participantsToInsert = participantIds.map((uid: string) => ({ thread_id: thread.id, user_id: uid }));
    const { error: partError } = await supabase
      .from('chat_participants')
      .insert(participantsToInsert);
    if (partError) return NextResponse.json({ error: partError.message }, { status: 500 });
    // Send notification to each participant (except creator)
    if (threadType === 'group' && title && participantIds.length > 1) {
      // Get creator profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', participantIds[0])
        .single();
      const notifications = participantIds.slice(1).map(pid => ({
        user_id: pid,
        title: 'Added to group chat',
        body: `${creatorProfile?.name || 'Someone'} added you to group chat "${title}"`,
        read: false,
        metadata: {
          type: 'group_chat_added',
          thread_id: thread.id,
          creator_id: participantIds[0],
          group_title: title
        }
      }));
      await supabase.from('notifications').insert(notifications);
    }
    return NextResponse.json({ threadId: thread.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
