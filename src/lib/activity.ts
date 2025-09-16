import { supabase } from '@/lib/supabase'

export type ActivityType = 'view' | 'search' | 'add_to_cart' | 'purchase' | 'stall_view'

type LogActivityOptions = {
  userId: string
  activityType: ActivityType
  productId?: string | null
  query?: string | null
  stallId?: string | null
}

export async function logActivity({ userId, activityType, productId = null, query = null, stallId = null }: LogActivityOptions) {
  try {
    if (!userId) return
    await supabase.from('user_activity').insert([
      {
        user_id: userId,
        activity_type: activityType,
        product_id: productId,
        query,
        stall_id: stallId,
      },
    ])
  } catch (err) {
    // Best-effort logging; don't throw
    console.error('Failed to log activity', { err })
  }
}


