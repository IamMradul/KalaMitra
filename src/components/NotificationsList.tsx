 'use client'

import { useEffect, useState } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trash2, Bell } from 'lucide-react'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export default function NotificationsList() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchNotes()

    // Poll for notifications every 3 seconds
    const pollInterval = setInterval(() => {
      fetchNotes();
    }, 3000);

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch notifications on any change
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [user])

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      setNotes((data || []) as NotificationRow[])
    } catch (err: unknown) {
      console.error('fetch notifications', err)
    }
    setLoading(false)
  }

  const markRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
      fetchNotes()
    } catch (err: unknown) {
      console.error('mark read', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id)
      fetchNotes()
    } catch (err: unknown) {
      console.error('delete notification', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notes.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return
      
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
      fetchNotes()
    } catch (err: unknown) {
      console.error('mark all as read', err)
    }
  }

  if (!user) return (
    <div className="text-center py-8">
      <Bell className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-50" />
      <p className="text-[var(--text)]">Please sign in to see notifications</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-3 border-[var(--heritage-gold)] border-t-transparent rounded-full"
      />
      <span className="ml-3 text-[var(--text)]">Loading notifications...</span>
    </div>
  )

  if (notes.length === 0) return (
    <div className="text-center py-12">
      <Bell className="w-16 h-16 text-[var(--muted)] mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No notifications</h3>
      <p className="text-[var(--muted)]">You're all caught up!</p>
    </div>
  )

  const unreadCount = notes.filter(n => !n.read).length

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {notes.map((n, index) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl border transition-all duration-200 ${
              n.read
                ? 'bg-[var(--bg-1)] border-[var(--border)] opacity-75'
                : 'bg-[var(--bg-2)] border-blue-400 dark:border-blue-600 shadow-md'
            } hover:shadow-lg group`}
          >
            <div className="flex gap-4">
              {/* Icon/Indicator */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                n.read
                  ? 'bg-[var(--bg-3)]'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <Bell className={`w-5 h-5 ${
                  n.read
                    ? 'text-[var(--muted)]'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h3 className={`font-semibold text-base ${
                    n.read
                      ? 'text-[var(--muted)]'
                      : 'text-[var(--text)]'
                  }`}>
                    {n.title}
                  </h3>
                  {!n.read && (
                    <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                  )}
                </div>
                
                <p className={`text-sm mb-2 leading-relaxed ${
                  n.read
                    ? 'text-[var(--muted)]'
                    : 'text-[var(--text)]'
                }`}>
                  {n.body}
                </p>
                
                <p className="text-xs text-[var(--muted)] italic">
                  {new Date(n.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
