import { useEffect, useState } from 'react'
import { Camera, Check, Play, X } from 'lucide-react'
import { markRetroSeen, pendingRetro, periodLabel } from '../lib/retro'
import type { Period } from '../lib/retro'
import RetroStory from './RetroStory'
import { refreshMembers, useMembers } from '../lib/members'
import { openCamera, useCamera } from '../lib/camera'
import { streakOf, useToday } from '../lib/today'
import { streakBonus } from '../lib/utils'
import ActivityIcon from './ActivityIcon'
import { FlameMark } from './Logo'
import PushOffer from './PushOffer'
import FeedSection from './FeedSection'
import Stories from './Stories'
import TopBar from './TopBar'
import { SkeletonCard } from './Skeleton'

/** Início: stories, como está o seu dia e o feed do grupo. */
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
      <RetroBanner userId={userId} />
      <TodayCard userId={userId} />
      <FeedSection userId={userId} />
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

  const rows = (['exercicio', 'leitura'] as const).map((a) => {
    const done = today.done[a].has(userId)
    const streak = streakOf(today, userId, a)
    const pct = me?.current_book_total_pages && me.current_book_page ? Math.min(100, Math.round((me.current_book_page / me.current_book_total_pages) * 100)) : null
    const context = a === 'leitura' ? (me?.current_book ? `${me.current_book}${pct !== null ? ` · ${pct}%` : ''}` : null) : me?.exercises
    return {
      kind: a,
      title: a === 'exercicio' ? 'Exercício' : 'Leitura',
      sub: done ? 'Feito hoje' : (context ?? (weekend ? 'Opcional no fim de semana' : 'Falta hoje')),
      done,
      streak,
      bonus: streakBonus(done ? streak : streak + 1),
    }
  })

  const pending = rows.filter((r) => !r.done).length
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
              <span className="today-streak" aria-label={`${r.streak} dias seguidos`}>
                <FlameMark size={16} />
                {r.streak}
              </span>
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

/** Aviso no Início quando a retrospectiva da semana (ou do mês) passada fica pronta. */
function RetroBanner({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period | null>(() => pendingRetro())
  const [open, setOpen] = useState(false)
  if (!period) return null
  const close = () => {
    markRetroSeen(period)
    setPeriod(null)
  }
  return (
    <>
      <section className={`retro-banner ${period.kind}`}>
        <button className="retro-banner-main" onClick={() => setOpen(true)}>
          <span className="retro-banner-play" aria-hidden>
            <Play size={18} fill="currentColor" />
          </span>
          <span>
            <span className="retro-banner-title">
              {period.kind === 'semana' ? 'Sua retrospectiva da semana chegou' : `Sua retrospectiva de ${periodLabel(period)} chegou`}
            </span>
            <span className="retro-banner-sub">{period.kind === 'semana' ? periodLabel(period) : 'Gráficos e números do mês'}</span>
          </span>
        </button>
        <button className="retro-banner-x" onClick={close} aria-label="Dispensar">
          <X size={16} aria-hidden />
        </button>
      </section>
      {open && (
        <RetroStory
          period={period}
          userId={userId}
          onClose={() => {
            setOpen(false)
            setPeriod(null)
          }}
        />
      )}
    </>
  )
}
