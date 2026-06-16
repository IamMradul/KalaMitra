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

    // Fetch sender profile and recipients to send notifications
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('thread_id', threadId)
      .neq('user_id', senderId);

    if (participants && participants.length > 0) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', senderId)
        .single();
        
      const notifications = participants.map((p: any) => ({
        user_id: p.user_id,
        title: 'New Message',
        body: `You have a new message from ${senderProfile?.name || 'someone'}`,
        read: false,
        metadata: { type: 'chat_message', thread_id: threadId, message_id: data.id }
      }));
      const { data: insertedNotes } = await supabase.from('notifications').insert(notifications).select();

      // Manually broadcast the notification to bypass RLS limitations on Postgres Changes
      if (insertedNotes) {
        for (const note of insertedNotes) {
          const channel = supabase.channel(`navbar_notifications_${note.user_id}`);
          await new Promise<void>((resolve) => {
            channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                await channel.send({
                  type: 'broadcast',
                  event: 'new_notification',
                  payload: { notification: note }
                });
                supabase.removeChannel(channel);
                resolve();
              }
            });
          });
        }
      }
    }

    // Manually broadcast the new message to bypass RLS limitations
    const msgChannel = supabase.channel(`chat_messages_${threadId}`);
    await new Promise<void>((resolve) => {
      msgChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await msgChannel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { message: data }
          });
          supabase.removeChannel(msgChannel);
          resolve();
        }
      });
    });

    return NextResponse.json({ message: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
