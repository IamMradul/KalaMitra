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
    <div className="space-y-2">
      {notes.map(n => (
        <div key={n.id} className={`p-3 rounded border ${n.read ? 'bg-[var(--bg-2)]' : 'card'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-[var(--text)]">{n.title}</div>
              <div className="text-sm text-[var(--muted)]">{n.body}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read && <button onClick={() => markRead(n.id)} className="ml-3 px-2 py-1 bg-green-600 text-white rounded">Mark read</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
