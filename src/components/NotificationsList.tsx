 'use client'

import { useEffect, useState } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export default function NotificationsList() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchNotes()
  }, [user])

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false })
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

  if (!user) return <div>Please sign in to see notifications</div>
  if (loading) return <div>Loading notifications...</div>
  if (notes.length === 0) return <div>No notifications</div>

  return (
    <div className="space-y-4">
      {notes.map(n => (
        <div
          key={n.id}
          className={`p-4 rounded-xl border shadow-md transition-all duration-200 ${n.read ? 'bg-[var(--bg-2)] border-[var(--border)]' : 'notification-unread bg-[var(--bg-2)] border-[var(--border)]'} hover:shadow-lg`}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-semibold text-lg text-[var(--text)] mb-1">{n.title}</div>
              <div className="text-sm text-[var(--muted)] mb-1">{n.body}</div>
              <div className="text-xs text-[var(--muted)] mt-1 italic">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read && (
              <button
                onClick={() => markRead(n.id)}
                className="ml-3 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all border border-green-700 drop-shadow"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
              >
                Mark read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
