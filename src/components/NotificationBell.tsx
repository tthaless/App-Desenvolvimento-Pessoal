import { Bell } from 'lucide-react'
import { openNotifications, unreadCount, useNotificationState } from '../lib/notifications'

/** Sininho do canto de cima, com o número de avisos novos. */
export default function NotificationBell() {
  const { items } = useNotificationState()
  const unread = unreadCount(items)
  return (
    <button
      className={`bell ${unread ? 'has-new' : ''}`}
      onClick={openNotifications}
      aria-label={unread ? `Notificações, ${unread} novas` : 'Notificações'}
    >
      <Bell size={21} strokeWidth={2} aria-hidden />
      {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  )
}
