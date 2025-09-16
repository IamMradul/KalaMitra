import NotificationsList from '@/components/NotificationsList'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="bg-white p-6 rounded border">
          <NotificationsList />
        </div>
      </div>
    </div>
  )
}
