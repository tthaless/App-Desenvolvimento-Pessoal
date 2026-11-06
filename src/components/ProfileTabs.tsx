import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ACTIVITY } from '../types'
import type { Activity, Member, StreakRow } from '../types'
import Bookshelf from './Bookshelf'
import CurrentBook from './CurrentBook'
import FeedList from './FeedList'

type Sub = 'estante' | 'posts' | 'sobre'

interface Props {
  member: Member
  viewerId: string
  streaks: StreakRow[]
}

/** Subabas do perfil (meu e dos amigos): Estante, Posts e Sobre. */
export default function ProfileTabs({ member, viewerId, streaks }: Props) {
  const [sub, setSub] = useState<Sub>('estante')
  const [shelfKey, setShelfKey] = useState(0)
  const isMe = member.id === viewerId

  return (
    <>
      <nav className="subtabs" aria-label="Seções do perfil">
        {(
          [
            ['estante', '📚 Estante'],
            ['posts', '💬 Posts'],
            ['sobre', 'ℹ️ Sobre'],
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

      {sub === 'sobre' && <About member={member} streaks={streaks} />}
    </>
  )
}

function About({ member, streaks }: { member: Member; streaks: StreakRow[] }) {
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
      <div className="stat-grid">
        {activities.map((a) => {
          const s = streaks.find((r) => r.activity === a)
          return (
            <section key={a} className={`card stat act-${a}`}>
              <p className="muted small">
                {ACTIVITY[a].emoji} {ACTIVITY[a].label}
              </p>
              <p className="stat-big">🔥 {s?.current_streak ?? 0}</p>
              <p className="muted small">Recorde: {s?.best_streak ?? 0}</p>
            </section>
          )
        })}
      </div>

      <section className="card info-list">
        <div className="info act-exercicio">
          <span className="info-icon" aria-hidden>🏋️</span>
          <div>
            <p className="muted small">Exercícios</p>
            <p className="info-value">{member.exercises || <span className="muted">Nada informado</span>}</p>
          </div>
        </div>
        <div className="info">
          <span className="info-icon" aria-hidden>📸</span>
          <div>
            <p className="muted small">Provas postadas</p>
            <p className="info-value">{total ?? '…'}</p>
          </div>
        </div>
      </section>
    </>
  )
}

/** Streak atual das duas atividades, em pílulas, para o topo do perfil. */
export function StreakPills({ streaks }: { streaks: StreakRow[] }) {
  const activities: Activity[] = ['exercicio', 'leitura']
  return (
    <div className="streak-pills">
      {activities.map((a) => (
        <span key={a} className={`streak-pill act-${a}`} title={`Streak de ${ACTIVITY[a].label.toLowerCase()}`}>
          {ACTIVITY[a].emoji} 🔥 {streaks.find((r) => r.activity === a)?.current_streak ?? 0}
        </span>
      ))}
    </div>
  )
}
