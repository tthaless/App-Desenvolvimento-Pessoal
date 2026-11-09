import { useEffect, useState } from 'react'
import { BellOff, BookOpen, Bookmark, Dumbbell, Heart, MessageCircle, Target, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  clearNotifications,
  closeNotifications,
  goTo,
  isExpired,
  markAllRead,
  targetOf,
  useNotificationState,
} from '../lib/notifications'
import type { AppNotification } from '../lib/notifications'
import { useMembers } from '../lib/members'
import { timeAgo } from '../lib/utils'
import { useDragToClose } from '../lib/useDragToClose'
import Avatar from './Avatar'
import { ArrowMark } from './Logo'
import { SkeletonRows } from './Skeleton'

const PROVA: Record<string, string> = {
  exercicio: 'prova de exercício',
  leitura: 'prova de leitura',
  desafio: 'check-in do desafio',
}

/** O que aconteceu, sem o nome de quem fez (ele vem em negrito antes). */
function describe(n: AppNotification) {
  const prova = PROVA[n.detail ?? ''] ?? 'prova'
  const livro = n.detail ? <em>{n.detail}</em> : 'seu livro'
  switch (n.kind) {
    case 'story_comment':
      return <>comentou na sua {prova}</>
    case 'story_reply':
      return <>respondeu na {prova} que você comentou</>
    case 'feed_comment':
      return n.detail ? <>comentou no post de quando você terminou {livro}</> : <>comentou no seu post</>
    case 'feed_reply':
      return <>respondeu no post que você comentou</>
    case 'book_like':
      return <>curtiu que você terminou {livro}</>
    case 'want_too':
      return <>também quer ler {livro}, da sua lista</>
    case 'challenge_vote':
      return <>votou na sua ideia de desafio {n.detail ? <em>{n.detail}</em> : ''}</>
    case 'last_one':
      return null
  }
}

function iconOf(n: AppNotification): { Icon: LucideIcon; tone: string } {
  if (n.kind === 'book_like') return { Icon: Heart, tone: 'like' }
  if (n.kind === 'want_too') return { Icon: Bookmark, tone: 'reading' }
  if (n.kind === 'challenge_vote') return { Icon: Target, tone: 'challenge' }
  if (n.kind === 'last_one') return n.detail === 'leitura' ? { Icon: BookOpen, tone: 'reading' } : { Icon: Dumbbell, tone: 'exercise' }
  if (n.kind.startsWith('story')) {
    if (n.detail === 'exercicio') return { Icon: Dumbbell, tone: 'exercise' }
    if (n.detail === 'leitura') return { Icon: BookOpen, tone: 'reading' }
    return { Icon: Target, tone: 'challenge' }
  }
  return { Icon: MessageCircle, tone: 'brand' }
}

export default function NotificationsSheet() {
  const { items, loaded, open } = useNotificationState()
  const members = useMembers()
  const sheetRef = useDragToClose<HTMLDivElement>(closeNotifications, open)
  // O que era novo quando abriu continua destacado enquanto a lista está aberta.
  const [fresh, setFresh] = useState<Set<string>>(new Set())

  const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id).join(',')
  useEffect(() => {
    if (!open) {
      setFresh(new Set())
      return
    }
    if (!unreadIds) return
    setFresh((prev) => new Set([...prev, ...unreadIds.split(',')]))
    const t = setTimeout(markAllRead, 600)
    return () => clearTimeout(t)
  }, [open, unreadIds])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeNotifications()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={closeNotifications}>
      <div className="sheet notif-sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Notificações">
        <span className="sheet-grip" aria-hidden />
        <header className="notif-head">
          <h2>Notificações</h2>
          {items.length > 0 && (
            <button className="link-btn" onClick={clearNotifications}>
              Limpar
            </button>
          )}
          <button className="viewer-close" onClick={closeNotifications} aria-label="Fechar">
            <X size={22} aria-hidden />
          </button>
        </header>

        <div className="notif-list">
          {!loaded && <SkeletonRows count={4} />}
          {loaded && items.length === 0 && (
            <div className="notif-empty">
              <BellOff size={28} aria-hidden />
              <p>Nada por aqui ainda.</p>
              <p className="muted small">Comentários nas suas provas e posts, curtidas nos seus livros e o aviso de quando só falta você postar aparecem aqui.</p>
            </div>
          )}
          {items.map((n) => {
            const actor = members.find((m) => m.id === n.actor_id)
            const name = actor?.username ?? 'Alguém'
            const expired = isExpired(n)
            const target = targetOf(n)
            const { Icon, tone } = iconOf(n)
            return (
              <button
                key={n.id}
                className={`notif ${fresh.has(n.id) ? 'new' : ''} ${expired ? 'expired' : ''}`}
                disabled={expired || !target}
                onClick={() => target && goTo(target)}
              >
                <span className="notif-avatar">
                  {n.kind === 'last_one' ? (
                    <span className="avatar md notif-app">
                      <ArrowMark size={30} />
                    </span>
                  ) : (
                    <Avatar name={name} url={actor?.avatar_url} size="md" />
                  )}
                  <span className={`notif-kind tone-${tone}`}>
                    <Icon size={11} strokeWidth={2.6} aria-hidden />
                  </span>
                </span>
                <span className="notif-text">
                  {n.kind === 'last_one' ? (
                    <span>
                      <strong>Só falta você!</strong> O resto do grupo já {n.detail === 'leitura' ? 'leu' : 'treinou'} hoje. Vai ficar de
                      fora?
                    </span>
                  ) : (
                    <span>
                      <strong>{name}</strong> {describe(n)}
                    </span>
                  )}
                  {n.preview && <span className="notif-preview">“{n.preview}”</span>}
                  <span className="notif-time">
                    {timeAgo(n.created_at)}
                    {expired && (n.kind === 'last_one' ? ' · o dia acabou' : ' · já sumiu')}
                  </span>
                </span>
                {fresh.has(n.id) && <span className="notif-dot" aria-label="Nova" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
