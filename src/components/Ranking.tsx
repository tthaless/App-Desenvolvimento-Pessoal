import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import type { RankingRow } from '../types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Ranking({ userId }: { userId: string }) {
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase.rpc('ranking', { periodo }).then(({ data, error }) => {
      if (!active) return
      if (error) setError(errorMessage(error))
      else {
        setError(null)
        setRows((data ?? []) as RankingRow[])
      }
    })
    return () => {
      active = false
    }
  }, [periodo])

  const leader = rows[0]?.pontos > 0 ? rows[0] : null

  return (
    <div className="ranking">
      <header className="page-head">
        <h1>
          <span aria-hidden>🏆</span> Ranking
        </h1>
      </header>

      <div className="segmented">
        <button className={periodo === 'semana' ? 'on' : ''} onClick={() => setPeriodo('semana')}>
          Esta semana
        </button>
        <button className={periodo === 'mes' ? 'on' : ''} onClick={() => setPeriodo('mes')}>
          Este mês
        </button>
      </div>

      {error && <p className="msg error">{error}</p>}

      {leader && (
        <section className="card leader">
          <span className="leader-crown" aria-hidden>👑</span>
          <div>
            <p className="muted small">Liderando {periodo === 'semana' ? 'a semana' : 'o mês'}</p>
            <p className="leader-name">{leader.user_id === userId ? 'Você' : leader.username}</p>
          </div>
          <span className="leader-pts">{leader.pontos} pts</span>
        </section>
      )}

      <section className="card">
        <ol className="rank-list">
          {rows.map((r, i) => (
            <li key={r.user_id} className={r.user_id === userId ? 'me' : ''}>
              <span className="pos">{r.pontos > 0 && i < 3 ? MEDALS[i] : i + 1}</span>
              <span className="name">{r.username}</span>
              <span className="days muted">{r.dias} {r.dias === 1 ? 'dia' : 'dias'}</span>
              <span className="pts">{r.pontos}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="muted small rules">
        10 pontos por prova · +5 de bônus no dia em que você faz as duas atividades. A semana começa na segunda.
      </p>
    </div>
  )
}
