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
        (payload: any) => {
          // Refetch after a small delay to ensure data consistency
          setTimeout(() => {
            fetchNotes();
          }, 100);
        }
      )
      .subscribe();

    return () => {
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
    <div
      className="space-y-4"
      style={{
        // Bluish overrides for this component only
        '--primary': '#2563eb', // blue-600
        '--primary-400': '#60a5fa', // blue-400
      } as React.CSSProperties}
    >
      {unreadCount > 0 && (
        <div className="flex items-center justify-between border rounded-xl mb-4 p-4"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold hover:underline transition-colors"
              style={{ color: 'var(--primary)' }}
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
            className={`p-4 rounded-xl border transition-all duration-200 group`}
            style={{
              background: n.read ? 'var(--bg-2)' : 'var(--bg)',
              borderColor: n.read ? 'var(--border)' : 'var(--primary-400)',
              opacity: n.read ? 0.75 : 1,
              boxShadow: n.read ? undefined : '0 2px 8px 0 rgba(80, 80, 200, 0.08)'
            }}
          >
            <div className="flex gap-4">
              {/* Icon/Indicator */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: n.read ? 'var(--bg-2)' : 'var(--primary-400)' }}
              >
                <Bell
                  className="w-5 h-5"
                  style={{ color: n.read ? 'var(--muted)' : 'var(--bg)' }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h3
                    className="font-semibold text-base"
                    style={{ color: n.read ? 'var(--muted)' : 'var(--text)' }}
                  >
                    {n.title}
                  </h3>
                  {!n.read && (
                    <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5 border border-white"></span>
                  )}
                </div>
                <p
                  className="text-sm mb-2 leading-relaxed"
                  style={{ color: n.read ? 'var(--muted)' : 'var(--text)' }}
                >
                  {n.body}
                </p>
                <p
                  className="text-xs italic"
                  style={{ color: 'var(--muted)' }}
                >
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
                    className="p-2 rounded-lg border transition-colors"
                    style={{
                      background: 'var(--success)',
                      color: 'var(--bg)',
                      borderColor: 'var(--success)',
                    }}
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 rounded-lg border transition-colors"
                  style={{
                    background: 'var(--danger-red)',
                    color: 'var(--bg)',
                    borderColor: 'var(--danger-red)',
                  }}
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
