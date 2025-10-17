import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(req: Request) {
  try {
    const { userId, sessionId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Delete all messages for this session
    const { error } = await supabase
      .from('conversation_history')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    console.log(`Deleted conversation for user ${userId}, session ${sessionId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (e) {
    console.error('Delete conversation error:', e);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
    }, { status: 500 });
  }
}
