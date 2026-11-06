import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ACTIVITY } from '../types'
import type { Activity, StreakRow } from '../types'

export default function Profile({ userId }: { userId: string }) {
  const [username, setUsername] = useState('')
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
      .then(({ data }) => setUsername(data?.username ?? ''))
    supabase.rpc('streaks').then(({ data }) => setStreaks(((data ?? []) as StreakRow[]).filter((r) => r.user_id === userId)))
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setTotal(count ?? 0))
  }, [userId])

  const activities: Activity[] = ['exercicio', 'leitura']

  return (
    <div className="profile">
      <header className="page-head">
        <h1>
          <span aria-hidden>👤</span> Perfil
        </h1>
      </header>

      <section className="card profile-card">
        <span className="avatar lg">{username.slice(0, 1).toUpperCase() || '?'}</span>
        <div>
          <p className="profile-name">{username}</p>
          <p className="muted small">{total} {total === 1 ? 'prova postada' : 'provas postadas'}</p>
        </div>
      </section>

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

      <button className="btn ghost full" onClick={() => supabase.auth.signOut()}>
        Sair da conta
      </button>
    </div>
  )
}
