import NotificationsList from '@/components/NotificationsList'

export default function NotificationsPage() {
  return (
  <div className="min-h-screen py-8" style={{ background: 'linear-gradient(180deg, var(--bg-1), var(--bg-1))' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="bg-[var(--bg-2)] p-0 sm:p-4 rounded-2xl border border-[var(--border)] shadow-lg">
          <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <NotificationsList />
          </div>
        </div>
      </div>
    </div>
  )
}
