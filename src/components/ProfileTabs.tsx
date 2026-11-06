import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ACTIVITY } from '../types'
import type { Activity, Member, StreakRow } from '../types'
import Bookshelf from './Bookshelf'
import CurrentBook from './CurrentBook'
import FeedList from './FeedList'

type Sub = 'posts' | 'estante'

interface Props {
  member: Member
  viewerId: string
}

/** Subabas do perfil (meu e dos amigos): Posts e Estante, como no Twitter. */
export default function ProfileTabs({ member, viewerId }: Props) {
  const [sub, setSub] = useState<Sub>('posts')
  const [shelfKey, setShelfKey] = useState(0)
  const isMe = member.id === viewerId

  return (
    <>
      <nav className="subtabs" aria-label="Seções do perfil">
        {(
          [
            ['posts', '💬 Posts'],
            ['estante', '📚 Estante'],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)} aria-current={sub === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>

      {sub === 'estante' && (
        <>
          {isMe ? (
            <CurrentBook userId={member.id} onShelfChanged={() => setShelfKey((k) => k + 1)} />
          ) : (
            member.current_book && (
              <section className="card current-book act-leitura">
                <p className="muted small">📖 Lendo agora</p>
                <p className="book-title">{member.current_book}</p>
              </section>
            )
          )}
          <Bookshelf userId={member.id} refreshKey={shelfKey} />
        </>
      )}

      {sub === 'posts' && (
        <FeedList
          userId={viewerId}
          authorId={member.id}
          emptyText={isMe ? 'Você não postou nada no feed nas últimas 24h.' : `${member.username} não postou nada no feed nas últimas 24h.`}
        />
      )}
    </>
  )
}

/** Informações do topo do perfil: streaks com recorde, exercícios, livro e total de provas. */
export function ProfileInfo({ member, streaks }: { member: Member; streaks: StreakRow[] }) {
  const [total, setTotal] = useState<number | null>(null)
  const activities: Activity[] = ['exercicio', 'leitura']

  useEffect(() => {
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', member.id)
      .then(({ count }) => setTotal(count ?? 0))
  }, [member.id])

  return (
    <>
      <div className="profile-stats">
        {activities.map((a) => {
          const s = streaks.find((r) => r.activity === a)
          return (
            <div key={a} className={`mini-stat act-${a}`}>
              <span className="mini-label">
                {ACTIVITY[a].emoji} {ACTIVITY[a].label}
              </span>
              <span className="mini-value">🔥 {s?.current_streak ?? 0}</span>
              <span className="muted small">recorde {s?.best_streak ?? 0}</span>
            </div>
          )
        })}
      </div>
      <ul className="profile-meta">
        {member.exercises && <li>🏋️ {member.exercises}</li>}
        {member.current_book && <li>📖 Lendo {member.current_book}</li>}
        <li>📸 {total ?? '…'} {total === 1 ? 'prova postada' : 'provas postadas'}</li>
      </ul>
    </>
  )
}
