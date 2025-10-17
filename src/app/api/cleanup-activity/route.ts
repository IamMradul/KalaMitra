import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint aggregates old user activity and cleans up the database
// Should be called periodically (weekly/monthly) via cron job
export async function GET(req: Request) {
  try {
    // Optional: Add authentication check to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting user activity maintenance...');

    // Call the database function to aggregate and cleanup
    const { data, error } = await supabase.rpc('maintain_user_activity');

    if (error) {
      console.error('Error maintaining user activity:', error);
      return NextResponse.json({ 
        error: 'Failed to maintain user activity',
        details: error.message 
      }, { status: 500 });
    }

    console.log('User activity maintenance completed:', data);

    return NextResponse.json({
      success: true,
      message: 'User activity maintenance completed successfully',
      result: data
    });

  } catch (e) {
    console.error('Unexpected error during maintenance:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
    return NextResponse.json({ 
      error: 'Maintenance failed', 
      details: errorMessage 
    }, { status: 500 });
  }
}
