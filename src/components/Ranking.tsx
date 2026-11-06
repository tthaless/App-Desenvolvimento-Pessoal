import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openProfile, useMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import type { RankingRow } from '../types'
import Avatar from './Avatar'
import { Crown } from 'lucide-react'
import TopBar from './TopBar'
import { SkeletonRows } from './Skeleton'


export default function Ranking({ userId }: { userId: string }) {
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana')
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const members = useMembers()
  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatar_url

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

  const leader = rows && rows[0]?.pontos > 0 ? rows[0] : null

  return (
    <div className="ranking">
      <TopBar title="Ranking" />

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
          <span className="leader-avatar">
            <Avatar name={leader.username} url={avatarOf(leader.user_id)} size="lg" />
            <Crown className="leader-crown" size={22} aria-hidden />
          </span>
          <div>
            <p className="muted small">Liderando {periodo === 'semana' ? 'a semana' : 'o mês'}</p>
            <p className="leader-name">{leader.user_id === userId ? 'Você' : leader.username}</p>
          </div>
          <span className="leader-pts">{leader.pontos} pts</span>
        </section>
      )}

      <section className="section">
        <ol className="rank-list">
          {rows === null && <SkeletonRows count={5} />}
          {(rows ?? []).map((r, i) => (
            <li key={r.user_id} className={r.user_id === userId ? 'me' : ''}>
              <span className={`pos ${r.pontos > 0 && i < 3 ? `medal m${i + 1}` : ''}`}>{i + 1}</span>
              <button className="person" onClick={() => openProfile(r.user_id)}>
                <Avatar name={r.username} url={avatarOf(r.user_id)} size="sm" />
                <span className="name">{r.username}</span>
              </button>
              <span className="days muted">{r.dias} {r.dias === 1 ? 'dia' : 'dias'}</span>
              <span className="pts">{r.pontos}</span>
            </li>
          ))}
        </ol>
      </section>

      <details className="rules-box">
        <summary>Como funcionam os pontos</summary>
        <ul>
          <li>10 pontos por atividade feita no dia (várias fotos contam uma vez só)</li>
          <li>+5 no dia em que você faz exercício e leitura</li>
          <li>Desafio da semana: +30 com 5 dias, +40 com os 7</li>
          <li>A semana começa na segunda</li>
        </ul>
      </details>
    </div>
  )
}
