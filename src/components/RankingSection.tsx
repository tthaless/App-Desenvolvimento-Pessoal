import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { openProfile, useMembers } from '../lib/members'
import { useCamera } from '../lib/camera'
import { useToday } from '../lib/today'
import { errorMessage } from '../lib/utils'
import type { RankingRow } from '../types'
import ActivityIcon from './ActivityIcon'
import Avatar from './Avatar'
import { SkeletonRows } from './Skeleton'

type Periodo = 'semana' | 'mes'

/** Ranking da semana ou do mês, com quem já postou cada atividade hoje. */
export default function RankingSection({ userId }: { userId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const members = useMembers()
  const today = useToday()
  const { posted } = useCamera()
  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatar_url

  // Recarrega ao trocar o período e quando alguém posta (pontos mudam).
  const doneKey = today.done.exercicio.size + today.done.leitura.size
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
  }, [periodo, posted, doneKey])

  return (
    <section className="section ranking-section" aria-labelledby="ranking-title">
      <div className="section-head">
        <h2 id="ranking-title" className="section-heading">
          Ranking
        </h2>
        <div className="pill-switch" role="tablist" aria-label="Período do ranking">
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Mês'],
            ] as [Periodo, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={periodo === id} className={periodo === id ? 'on' : ''} onClick={() => setPeriodo(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="msg error">{error}</p>}

      <ol className="card rank-card">
        {rows === null && <SkeletonRows count={5} />}
        {(rows ?? []).map((r, i) => {
          const medal = r.pontos > 0 && i < 3 ? `m${i + 1}` : ''
          const did = (['exercicio', 'leitura'] as const).filter((a) => today.done[a].has(r.user_id))
          return (
            <li key={r.user_id} className={`rank-row ${r.user_id === userId ? 'me' : ''}`}>
              <span className={`rank-pos ${medal}`}>{i + 1}</span>
              <button className="person" onClick={() => openProfile(r.user_id)}>
                <span className="avatar-wrap">
                  <Avatar name={r.username} url={avatarOf(r.user_id)} size="sm" />
                  {i === 0 && r.pontos > 0 && <Crown className="rank-crown" size={14} aria-hidden />}
                </span>
                <span className="rank-name">
                  <span className="name">{r.username}</span>
                  <span className="rank-sub">
                    {r.dias} {r.dias === 1 ? 'dia' : 'dias'} com prova
                  </span>
                </span>
              </button>
              <span className="rank-today" aria-label={did.length ? `Hoje: ${did.map((a) => (a === 'exercicio' ? 'exercício' : 'leitura')).join(' e ')}` : 'Ainda não postou hoje'}>
                {(['exercicio', 'leitura'] as const).map((a) => (
                  <span key={a} className={`rank-dot act-${a} ${did.includes(a) ? 'on' : ''}`}>
                    <ActivityIcon activity={a} size={12} strokeWidth={2.4} />
                  </span>
                ))}
              </span>
              <span className="rank-pts">
                {r.pontos}
                <small>pts</small>
              </span>
            </li>
          )
        })}
      </ol>

      <details className="rules-box">
        <summary>Como funcionam os pontos</summary>
        <ul>
          <li>10 pontos por atividade feita no dia (várias fotos contam uma vez só)</li>
          <li>+5 no dia em que você faz exercício e leitura</li>
          <li>Bônus de streak, por atividade, em cada dia com prova: +2 a partir do 3º dia seguido, +3 a partir do 7º, +4 a partir do 14º e +5 a partir do 30º</li>
          <li>+30 ao terminar um livro com resumo (140 letras ou mais) ou com PDF de anotações</li>
          <li>A semana começa na segunda</li>
          <li>Fim de semana é livre: postar no sábado ou domingo soma pontos e dias no streak, e não postar não tira ponto nem quebra o streak</li>
          <li>O streak só quebra quando falta um dia de segunda a sexta</li>
        </ul>
      </details>
    </section>
  )
}
