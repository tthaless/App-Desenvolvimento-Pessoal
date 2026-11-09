import { useEffect } from 'react'
import { Camera, Check, ChevronRight } from 'lucide-react'
import { refreshMembers, useMembers } from '../lib/members'
import { openCamera, useCamera } from '../lib/camera'
import type { ProofKind } from '../lib/camera'
import { challengeDaysOf, streakOf, useToday } from '../lib/today'
import { streakBonus } from '../lib/utils'
import ActivityIcon from './ActivityIcon'
import { FlameMark } from './Logo'
import PushOffer from './PushOffer'
import RankingSection from './RankingSection'
import Stories from './Stories'
import TopBar from './TopBar'
import { SkeletonCard } from './Skeleton'

/** Início: stories, como está o seu dia e o ranking. */
export default function Home({ userId }: { userId: string }) {
  const { posted } = useCamera()

  useEffect(() => {
    refreshMembers().catch(() => {})
  }, [])

  return (
    <div className="home">
      <TopBar />
      <Stories userId={userId} />
      <PushOffer show={posted > 0} />
      <TodayCard userId={userId} />
      <RankingSection userId={userId} />
    </div>
  )
}

const LONG_DATE = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

function TodayCard({ userId }: { userId: string }) {
  const today = useToday()
  const me = useMembers().find((m) => m.id === userId)

  if (!today.loaded) return <SkeletonCard height={250} />

  const weekday = new Date(`${today.day}T12:00:00`).getDay()
  const weekend = weekday === 0 || weekday === 6

  const rows: { kind: ProofKind; title: string; sub: string; done: boolean; streak?: number; bonus?: number }[] = (
    ['exercicio', 'leitura'] as const
  ).map((a) => {
    const done = today.done[a].has(userId)
    const streak = streakOf(today, userId, a)
    const context = a === 'leitura' ? (me?.current_book ? `Lendo ${me.current_book}` : null) : me?.exercises
    return {
      kind: a,
      title: a === 'exercicio' ? 'Exercício' : 'Leitura',
      sub: done ? 'Feito hoje' : (context ?? (weekend ? 'Opcional no fim de semana' : 'Falta hoje')),
      done,
      streak,
      bonus: streakBonus(done ? streak : streak + 1),
    }
  })
  if (today.challenge) {
    const days = challengeDaysOf(today, userId)
    rows.push({
      kind: 'desafio',
      title: today.challenge.title,
      sub: days.has(today.day) ? `Cumprido hoje · ${days.size} de 7` : `${days.size} de 7 na semana`,
      done: days.has(today.day),
    })
  }

  const pending = rows.filter((r) => !r.done && r.kind !== 'desafio').length
  const hint =
    pending === 0
      ? weekday === 5
        ? 'Tudo feito! Fim de semana é livre: faltar não quebra o streak.'
        : 'Tudo feito hoje. Volte amanhã pra manter o streak.'
      : weekend
        ? 'Fim de semana é livre: postar soma pontos, faltar não quebra o streak.'
        : 'Poste até a meia-noite pra manter o streak.'

  return (
    <section className="card day-card" aria-labelledby="today-title">
      <header className="today-head">
        <div>
          <p className="eyebrow">{LONG_DATE.format(new Date(`${today.day}T12:00:00-03:00`))}</p>
          <h2 id="today-title" className="today-title">
            Seu dia
          </h2>
        </div>
        <span className={`today-progress ${pending === 0 ? 'complete' : ''}`} aria-label={`${2 - pending} de 2 atividades feitas`}>
          {2 - pending}/2
        </span>
      </header>

      {today.error && <p className="msg error">{today.error}</p>}

      <ul className="today-list">
        {rows.map((r) => (
          <li key={r.kind}>
            <button
              className={`today-item act-${r.kind} ${r.done ? 'done' : ''}`}
              onClick={() => openCamera(r.kind)}
              disabled={r.kind === 'desafio' && r.done}
              aria-label={`${r.title}: ${r.sub}${r.done ? '' : '. Tocar para postar a prova'}`}
            >
              <span className="today-icon">
                <ActivityIcon activity={r.kind} size={20} />
                {r.done && (
                  <span className="today-check">
                    <Check size={10} strokeWidth={4} aria-hidden />
                  </span>
                )}
              </span>
              <span className="today-text">
                <span className="today-name">{r.title}</span>
                <span className="today-sub">
                  <span className="today-sub-text">{r.sub}</span>
                  {!!r.bonus && <span className="bonus-chip">+{r.bonus} bônus</span>}
                </span>
              </span>
              {r.streak !== undefined ? (
                <span className="today-streak" aria-label={`${r.streak} dias seguidos`}>
                  <FlameMark size={16} />
                  {r.streak}
                </span>
              ) : (
                !r.done && <ChevronRight size={18} className="today-chevron" aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>

      <p className="today-hint">{hint}</p>

      {pending > 0 && (
        <button className="btn primary big-btn" onClick={() => openCamera()}>
          <Camera size={20} aria-hidden /> Postar prova
        </button>
      )}
    </section>
  )
}
