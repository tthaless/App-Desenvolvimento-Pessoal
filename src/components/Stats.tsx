import { Suspense, useEffect, useState } from 'react'
import { ArrowUpRight, BookOpen, CalendarDays, Camera, ChartColumn, Clock, Dumbbell, Layers, Play, Sparkles } from 'lucide-react'
import { BADGES, progressOf, unitOf, useBadgeStats } from '../lib/badges'
import { openCamera, useCamera } from '../lib/camera'
import EmptyState from './EmptyState'
import {
  WEEKDAYS_SHORT,
  daysIn,
  daysWithProof,
  fetchRetro,
  hourPersona,
  periodLabel,
  periodOf,
  summarize,
  weekdayOf,
} from '../lib/retro'
import type { Period, PeriodKind, RetroData } from '../lib/retro'
import { errorMessage } from '../lib/utils'
import BadgeMedal from './BadgeMedal'
import { lazyScreen } from '../lib/lazy'
import GroupBooks from './GroupBooks'
import MonthCalendar from './MonthCalendar'
import StreakCard from './StreakCard'
import { PIN_STATS } from '../lib/pins'
import { useToday } from '../lib/today'
import { SkeletonCard } from './Skeleton'

const RetroStory = lazyScreen(() => import('./RetroStory'))

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

/** Evolução (no Perfil): retrospectivas, seus números comparados com a média do grupo e o que o grupo leu. */
export default function Stats({ userId }: { userId: string }) {
  const [kind, setKind] = useState<PeriodKind>('semana')
  const period = periodOf(kind, 0)
  const [data, setData] = useState<RetroData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [story, setStory] = useState<Period | null>(null)
  const { posted } = useCamera()

  useEffect(() => {
    let active = true
    setData(null)
    fetchRetro(period)
      .then((d) => active && (setData(d), setError(null)))
      .catch((e) => active && setError(errorMessage(e)))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, period.inicio, posted])

  const lastWeek = periodOf('semana', -1)
  const lastMonth = periodOf('mes', -1)

  return (
    <div className="stats">
      <section className="retro-cards" aria-label="Retrospectivas">
        <button className="retro-card week" onClick={() => setStory(lastWeek)}>
          <span className="retro-card-eyebrow">Retrospectiva</span>
          <span className="retro-card-title">Semana passada</span>
          <span className="retro-card-sub">{periodLabel(lastWeek)}</span>
          <span className="retro-card-play" aria-hidden>
            <Play size={16} fill="currentColor" />
          </span>
        </button>
        <button className="retro-card month" onClick={() => setStory(lastMonth)}>
          <span className="retro-card-eyebrow">Retrospectiva</span>
          <span className="retro-card-title">Mês de {periodLabel(lastMonth)}</span>
          <span className="retro-card-sub">Seus números do mês</span>
          <span className="retro-card-play" aria-hidden>
            <Play size={16} fill="currentColor" />
          </span>
        </button>
      </section>

      <Totals userId={userId} />

      <div className="section-head">
        <h2 className="section-heading">Seus números</h2>
        <div className="pill-switch" role="tablist" aria-label="Período">
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Mês'],
            ] as [PeriodKind, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="msg error">{error}</p>}
      {!data && !error && <SkeletonCard height={320} />}
      {data && <PeriodStats data={data} period={period} userId={userId} />}

      <NextBadges userId={userId} />

      <GroupBooks userId={userId} />

      {story && (
        <Suspense fallback={null}>
          <RetroStory period={story} userId={userId} onClose={() => setStory(null)} />
        </Suspense>
      )}
    </div>
  )
}

function Compare({ mine, avg, unit }: { mine: number; avg: number; unit?: string }) {
  // Sem vermelho: abaixo da média só mostra a referência, pra não desanimar ninguém.
  if (avg <= 0) return <span className="cmp neutral">primeira semana do grupo</span>
  const diff = mine - avg
  if (diff >= 0.5)
    return (
      <span className="cmp up">
        <ArrowUpRight size={13} aria-hidden /> {fmt(diff)}
        {unit ? ` ${unit}` : ''} acima da média
      </span>
    )
  if (diff > -0.5) return <span className="cmp neutral">na média do grupo</span>
  return <span className="cmp neutral">média do grupo: {fmt(avg)}</span>
}

function PeriodStats({ data, period, userId }: { data: RetroData; period: Period; userId: string }) {
  const s = summarize(data, userId)
  const me = s.me
  const days = daysIn(period)
  const byDay = new Map(s.myDays.map((d) => [d.day, d]))
  const maxPts = Math.max(1, ...s.myDays.map((d) => d.pts))
  const maxPages = Math.max(1, ...s.myDays.map((d) => d.pages))
  const pagesTotal = me?.paginas ?? 0
  const today = data.fim

  if (!me || me.provas === 0)
    return (
      <EmptyState
        icon={<ChartColumn size={28} />}
        title={period.kind === 'semana' ? 'Sua semana começa aqui' : 'Seu mês começa aqui'}
        text="Cada prova vira ponto, dia no gráfico e página lida. Compare com a média do grupo conforme a semana anda."
        action={
          <button className="btn primary full" onClick={() => openCamera()}>
            <Camera size={18} aria-hidden /> Postar prova
          </button>
        }
      />
    )

  return (
    <>
      <div className="metric-grid">
        <div className="metric card">
          <span className="metric-icon pts" aria-hidden>
            <Sparkles size={16} />
          </span>
          <span className="metric-value">{fmt(me?.pontos ?? 0)}</span>
          <span className="metric-label">pontos{me && me.pontos > 0 ? ` · ${me.posicao}º lugar` : ''}</span>
          <Compare mine={me?.pontos ?? 0} avg={s.avg.pontos} />
        </div>
        <div className="metric card">
          <span className="metric-icon days" aria-hidden>
            <CalendarDays size={16} />
          </span>
          <span className="metric-value">{me ? daysWithProof(me) : 0}</span>
          <span className="metric-label">dias com prova</span>
          <Compare mine={me ? daysWithProof(me) : 0} avg={s.avg.dias} unit="dias" />
        </div>
        <div className="metric card">
          <span className="metric-icon pages" aria-hidden>
            <Layers size={16} />
          </span>
          <span className="metric-value">{fmt(pagesTotal)}</span>
          <span className="metric-label">páginas lidas</span>
          <Compare mine={pagesTotal} avg={s.avg.paginas} unit="pág." />
        </div>
        <div className="metric card">
          <span className="metric-icon books" aria-hidden>
            <BookOpen size={16} />
          </span>
          <span className="metric-value">{me?.livros ?? 0}</span>
          <span className="metric-label">{me?.livros === 1 ? 'livro terminado' : 'livros terminados'}</span>
          <Compare mine={me?.livros ?? 0} avg={s.avg.livros} />
        </div>
      </div>

      <section className="card chart-card" aria-labelledby="chart-pts">
        <div className="chart-head">
          <h3 id="chart-pts">Pontos por dia</h3>
          {s.bestDay && <span className="muted small">Melhor dia: {WEEKDAYS_SHORT[weekdayOf(s.bestDay.day)]}, {s.bestDay.pts} pts</span>}
        </div>
        <div className={`bars ${days.length > 7 ? 'dense' : ''}`} role="img" aria-label="Gráfico de pontos por dia">
          {days.map((d) => {
            const x = byDay.get(d)
            const future = d > today
            return (
              <div key={d} className={`bar-col ${future ? 'future' : ''}`}>
                <div className="bar-track">
                  <span className="bar-fill" style={{ height: `${x ? Math.max(4, (x.pts / maxPts) * 100) : 0}%` }}>
                    {days.length <= 7 && x && x.pts > 0 && <em>{x.pts}</em>}
                  </span>
                </div>
                <span className="bar-marks" aria-hidden>
                  <i className={x?.ex ? 'ex on' : 'ex'} />
                  <i className={x?.rd ? 'rd on' : 'rd'} />
                </span>
                <span className="bar-label">{days.length <= 7 ? WEEKDAYS_SHORT[weekdayOf(d)] : Number(d.slice(8)) % 5 === 1 ? Number(d.slice(8)) : ''}</span>
              </div>
            )
          })}
        </div>
        <p className="chart-legend">
          <span>
            <i className="ex on" /> exercício
          </span>
          <span>
            <i className="rd on" /> leitura
          </span>
        </p>
      </section>

      {pagesTotal > 0 && (
        <section className="card chart-card" aria-labelledby="chart-pages">
          <div className="chart-head">
            <h3 id="chart-pages">Páginas por dia</h3>
            {s.bestPagesDay && (
              <span className="muted small">
                Recorde: {s.bestPagesDay.pages} pág. ({WEEKDAYS_SHORT[weekdayOf(s.bestPagesDay.day)]})
              </span>
            )}
          </div>
          <div className={`bars pages ${days.length > 7 ? 'dense' : ''}`} role="img" aria-label="Gráfico de páginas por dia">
            {days.map((d) => {
              const x = byDay.get(d)
              return (
                <div key={d} className={`bar-col ${d > today ? 'future' : ''}`}>
                  <div className="bar-track">
                    <span className="bar-fill" style={{ height: `${x?.pages ? Math.max(4, (x.pages / maxPages) * 100) : 0}%` }}>
                      {days.length <= 7 && !!x?.pages && <em>{x.pages}</em>}
                    </span>
                  </div>
                  <span className="bar-label">{days.length <= 7 ? WEEKDAYS_SHORT[weekdayOf(d)] : Number(d.slice(8)) % 5 === 1 ? Number(d.slice(8)) : ''}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {me && (me.hora_exercicio !== null || me.hora_leitura !== null) && (
        <section className="card habits">
          <h3>
            <Clock size={16} aria-hidden /> Seus horários
          </h3>
          <div className="habit-row">
            {me.hora_exercicio !== null && (
              <div className="habit act-exercicio">
                <Dumbbell size={18} aria-hidden />
                <span className="habit-hour">{me.hora_exercicio}h</span>
                <span className="muted small">treino {hourPersona(me.hora_exercicio)}</span>
              </div>
            )}
            {me.hora_leitura !== null && (
              <div className="habit act-leitura">
                <BookOpen size={18} aria-hidden />
                <span className="habit-hour">{me.hora_leitura}h</span>
                <span className="muted small">leitura {hourPersona(me.hora_leitura)}</span>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}

/** As insígnias mais perto de serem conquistadas (ou de subir de nível). */
function NextBadges({ userId }: { userId: string }) {
  const stats = useBadgeStats(userId)
  if (!stats || stats === 'erro') return null
  const next = BADGES.map((d) => progressOf(d, stats))
    .filter((p) => p.next !== null)
    .map((p) => {
      const prev = p.def.goals[p.level - 1] ?? 0
      return { p, pct: Math.max(0, Math.min(1, (p.value - prev) / ((p.next as number) - prev))) }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
  if (!next.length) return null
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-heading">Próximas insígnias</h2>
      </div>
      <ul className="card next-badges">
        {next.map(({ p, pct }) => (
          <li key={p.def.id}>
            <BadgeMedal icon={p.def.icon} tier={p.tier} size={42} />
            <div className="next-badge-text">
              <span className="next-badge-name">{p.def.name}</span>
              <div className="meter small" aria-hidden>
                <span style={{ width: `${pct * 100}%` }} />
              </div>
              <span className="muted small">
                {fmt(p.value)} de {fmt(p.next as number)} {unitOf(p.def, p.next as number)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Totais de sempre, sequências e calendário. */
function Totals({ userId }: { userId: string }) {
  const stats = useBadgeStats(userId)
  const today = useToday()
  const mine = today.streaks.filter((s) => s.user_id === userId)
  const ok = stats && stats !== 'erro' ? stats : null
  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2 className="section-heading">Seus totais</h2>
        </div>
        <ul className="totals-grid">
          {PIN_STATS.map((p) => (
            <li key={p.id} className="total-tile">
              <span className="total-value">{ok ? p.value(ok).toLocaleString('pt-BR') : '–'}</span>
              <span className="total-label">{p.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <StreakCard streaks={mine} />

      <section className="section pinnable">
        <div className="section-head">
          <h2 className="section-heading">Calendário do mês</h2>
        </div>
        <MonthCalendar userId={userId} />
      </section>
    </>
  )
}
