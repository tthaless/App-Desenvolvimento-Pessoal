import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Dumbbell, Share2, X } from 'lucide-react'
import {
  WEEKDAYS_LONG,
  daysIn,
  daysWithProof,
  fetchRetro,
  hourPersona,
  markRetroSeen,
  periodLabel,
  summarize,
  weekdayOf,
} from '../lib/retro'
import type { Period, RetroData, RetroDay, RetroPerson, Summary } from '../lib/retro'
import { useMembers } from '../lib/members'
import type { Member } from '../types'
import Avatar from './Avatar'
import { errorMessage } from '../lib/utils'
import { ArrowMark, FlameMark } from './Logo'

const SLIDE_MS = 6500
const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

interface Slide {
  id: string
  tone: string
  body: ReactNode
}

/** Retrospectiva em tela cheia, no estilo dos stories: um número grande por tela. */
export default function RetroStory({ period, userId, onClose }: { period: Period; userId: string; onClose: () => void }) {
  const [data, setData] = useState<RetroData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const startRef = useRef(0)
  const me = useMembers().find((m) => m.id === userId)

  useEffect(() => {
    fetchRetro(period)
      .then(setData)
      .catch((e) => setError(errorMessage(e)))
    markRetroSeen(period)
  }, [period])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => i + 1)
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])

  const members = useMembers()
  const slides = data ? buildSlides(data, period, userId, me?.username ?? '', members) : []
  const last = slides.length - 1

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= last) {
        onClose()
        return i
      }
      return i + 1
    })
  }, [last, onClose])

  // Avança sozinho; segurar o dedo pausa.
  useEffect(() => {
    if (!slides.length || paused || index >= last) return
    startRef.current = performance.now()
    const t = setTimeout(next, SLIDE_MS)
    return () => clearTimeout(t)
  }, [index, paused, slides.length, last, next])

  const slide = slides[Math.min(index, last)]

  return (
    <div className={`retro ${slide?.tone ?? 'tone-intro'}`} role="dialog" aria-modal="true" aria-label={`Retrospectiva: ${periodLabel(period)}`}>
      <div className="retro-progress" aria-hidden>
        {slides.map((s, i) => (
          <span key={s.id} className={i < index ? 'done' : i === index ? (paused ? 'now paused' : 'now') : ''}>
            <i style={{ animationDuration: `${SLIDE_MS}ms` }} />
          </span>
        ))}
      </div>
      <button className="retro-close" onClick={onClose} aria-label="Fechar retrospectiva">
        <X size={22} aria-hidden />
      </button>

      {!data && !error && <div className="retro-loading" aria-label="Carregando" />}
      {error && <p className="retro-error">{error}</p>}

      {slide && (
        <>
          <div
            className="retro-tap"
            onPointerDown={() => setPaused(true)}
            onPointerUp={(e) => {
              setPaused(false)
              const x = e.clientX / window.innerWidth
              if (x < 0.3) setIndex((i) => Math.max(0, i - 1))
              else next()
            }}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          />
          <section key={slide.id} className="retro-slide" aria-live="polite">
            {slide.body}
          </section>
        </>
      )}
    </div>
  )
}

/** Número que sobe do zero até o valor. */
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setV(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start - 250) / 900)
      setV(Math.round(value * (1 - Math.pow(1 - Math.max(0, t), 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span className="retro-big">
      {fmt(v)}
      {suffix}
    </span>
  )
}

function vsAvg(mine: number, avg: number, unit: string) {
  if (avg <= 0) return null
  const diff = mine - avg
  if (diff >= 0.5) return `${fmt(diff)} ${unit} acima da média do grupo`
  if (diff > -0.5) return 'Bem na média do grupo'
  return `A média do grupo foi ${fmt(avg)} ${unit}`
}

function buildSlides(data: RetroData, period: Period, userId: string, name: string, members: Member[]): Slide[] {
  const s: Summary = summarize(data, userId)
  const me = s.me
  const title = period.kind === 'semana' ? 'Sua semana' : `Seu ${periodLabel(period)}`
  const slides: Slide[] = [
    {
      id: 'intro',
      tone: 'tone-intro',
      body: (
        <>
          <ArrowMark size={84} className="retro-logo" stroke="#f6f6c9" />
          <p className="retro-eyebrow">Retrospectiva · {periodLabel(period)}</p>
          <h2 className="retro-title">
            {title}
            {name ? `, ${name}` : ''}
          </h2>
          <p className="retro-text">Bora ver como foi?</p>
        </>
      ),
    },
  ]

  if (!me || me.provas === 0) {
    slides.push({
      id: 'vazio',
      tone: 'tone-days',
      body: (
        <>
          <p className="retro-eyebrow">Constância</p>
          <h2 className="retro-title">Esse período passou em branco</h2>
          <p className="retro-text">Sem problema. Cada dia é uma chance nova de começar o streak. Uma foto hoje já conta.</p>
        </>
      ),
    })
    return slides
  }

  const days = daysIn(period)
  const byDay = new Map(s.myDays.map((d) => [d.day, d]))
  const total = daysWithProof(me)

  slides.push({
    id: 'dias',
    tone: 'tone-days',
    body: (
      <>
        <p className="retro-eyebrow">Constância</p>
        <p className="retro-lead">Você postou prova em</p>
        <CountUp value={total} />
        <p className="retro-lead">de {days.length} dias</p>
        <div className={`retro-dots ${days.length > 7 ? 'month' : ''}`} aria-hidden>
          {days.map((d) => {
            const x = byDay.get(d)
            return <i key={d} className={x?.ex && x?.rd ? 'both' : x?.ex ? 'ex' : x?.rd ? 'rd' : ''} />
          })}
        </div>
        <p className="retro-text">
          <Dumbbell size={16} aria-hidden /> {me.dias_exercicio} de exercício · <BookOpen size={16} aria-hidden /> {me.dias_leitura} de leitura
        </p>
        {vsAvg(total, s.avg.dias, 'dias') && <p className="retro-chip">{vsAvg(total, s.avg.dias, 'dias')}</p>}
      </>
    ),
  })

  slides.push({
    id: 'pontos',
    tone: 'tone-points',
    body: (
      <>
        <p className="retro-eyebrow">Pontos</p>
        <CountUp value={me.pontos} />
        <p className="retro-lead">pontos {period.kind === 'semana' ? 'na semana' : 'no mês'}</p>
        {me.pontos > 0 && <p className="retro-rank">{me.posicao === 1 ? 'Você terminou em 1º lugar!' : `Você terminou em ${me.posicao}º lugar`}</p>}
        {vsAvg(me.pontos, s.avg.pontos, 'pontos') && <p className="retro-chip">{vsAvg(me.pontos, s.avg.pontos, 'pontos')}</p>}
        <PointsLine days={days} data={data} userId={userId} ativos={s.ativos} />
        {s.bestDay && <p className="retro-text">Seu melhor dia foi {WEEKDAYS_LONG[weekdayOf(s.bestDay.day)]}, com {s.bestDay.pts} pontos.</p>}
      </>
    ),
  })

  if (period.kind === 'mes') {
    const weeks = weeksOf(days, s.myDays)
    slides.push({
      id: 'semanas',
      tone: 'tone-weeks',
      body: (
        <>
          <p className="retro-eyebrow">Semana a semana</p>
          <h2 className="retro-title small">Como o mês andou</h2>
          <div className="retro-weeks">
            {weeks.map((w, i) => (
              <div key={w.label} className="retro-week">
                <span className="retro-week-pts">{w.pts}</span>
                <i style={{ height: `${(w.pts / Math.max(1, ...weeks.map((x) => x.pts))) * 100}%`, animationDelay: `${0.3 + i * 0.08}s` }} />
                <span className="retro-week-label">{w.label}</span>
              </div>
            ))}
          </div>
          <p className="retro-text">
            {(() => {
              const best = weeks.reduce((a, b) => (b.pts > a.pts ? b : a), weeks[0])
              return best && best.pts > 0 ? `A melhor foi a semana de ${best.label}, com ${best.pts} pontos.` : 'Pontos de cada semana do mês.'
            })()}
          </p>
        </>
      ),
    })
  }

  slides.push({
    id: 'comparacao',
    tone: 'tone-compare',
    body: (
      <>
        <p className="retro-eyebrow">Você e o grupo</p>
        <h2 className="retro-title small">Lado a lado com a média</h2>
        <div className="retro-compare">
          <CompareRow label="Dias com prova" mine={total} avg={s.avg.dias} />
          <CompareRow label="Pontos" mine={me.pontos} avg={s.avg.pontos} />
          <CompareRow label="Dias de exercício" mine={me.dias_exercicio} avg={s.avg.dias_exercicio} />
          <CompareRow label="Dias de leitura" mine={me.dias_leitura} avg={s.avg.dias_leitura} />
          {(me.paginas > 0 || s.avg.paginas > 0) && <CompareRow label="Páginas" mine={me.paginas} avg={s.avg.paginas} />}
        </div>
        <p className="retro-legend">
          <span>
            <i className="me" /> você
          </span>
          <span>
            <i /> média de quem postou ({s.ativos} {s.ativos === 1 ? 'pessoa' : 'pessoas'})
          </span>
        </p>
      </>
    ),
  })

  if (me.paginas > 0 || me.livros > 0) {
    const maxPages = Math.max(1, ...s.myDays.map((d) => d.pages))
    const books = data.livros.filter((b) => b.user_id === userId)
    slides.push({
      id: 'leitura',
      tone: 'tone-reading',
      body: (
        <>
          <p className="retro-eyebrow">Leitura</p>
          {me.paginas > 0 ? (
            <>
              <CountUp value={me.paginas} />
              <p className="retro-lead">páginas lidas</p>
              <div className={`retro-bars ${days.length > 7 ? 'month' : ''}`} aria-hidden>
                {days.map((d) => (
                  <i key={d} style={{ height: `${((byDay.get(d)?.pages ?? 0) / maxPages) * 100}%` }} />
                ))}
              </div>
              {vsAvg(me.paginas, s.avg.paginas, 'páginas') && <p className="retro-chip">{vsAvg(me.paginas, s.avg.paginas, 'páginas')}</p>}
            </>
          ) : (
            <p className="retro-lead">Você terminou</p>
          )}
          {books.length > 0 && (
            <p className="retro-text">
              {books.length === 1 ? 'Terminou' : `Terminou ${books.length} livros:`} <strong>{books.map((b) => b.title).join(', ')}</strong>
              {books.length === 1 && books[0].dias >= 0 ? ` em ${books[0].dias || 1} ${books[0].dias === 1 || books[0].dias === 0 ? 'dia' : 'dias'}` : ''}.
            </p>
          )}
        </>
      ),
    })
  }

  if (me.hora_exercicio !== null || me.hora_leitura !== null) {
    const persona = hourPersona(me.hora_exercicio ?? me.hora_leitura)
    slides.push({
      id: 'horario',
      tone: 'tone-hours',
      body: (
        <>
          <p className="retro-eyebrow">Seu ritmo</p>
          <h2 className="retro-title">Perfil {persona}</h2>
          <div className="retro-hours">
            {me.hora_exercicio !== null && (
              <div>
                <Dumbbell size={22} aria-hidden />
                <span className="retro-hour">{me.hora_exercicio}h</span>
                <span>treino</span>
              </div>
            )}
            {me.hora_leitura !== null && (
              <div>
                <BookOpen size={22} aria-hidden />
                <span className="retro-hour">{me.hora_leitura}h</span>
                <span>leitura</span>
              </div>
            )}
          </div>
          <p className="retro-text">É o horário em que você mais postou prova.</p>
        </>
      ),
    })
  }

  const best = Math.max(me.streak_exercicio, me.streak_leitura)
  if (best >= 2) {
    slides.push({
      id: 'streak',
      tone: 'tone-streak',
      body: (
        <>
          <p className="retro-eyebrow">Sequência</p>
          <FlameMark size={90} className="retro-flame" />
          <CountUp value={best} />
          <p className="retro-lead">dias seguidos de {me.streak_exercicio >= me.streak_leitura ? 'exercício' : 'leitura'}</p>
          <p className="retro-text">Foi a sua maior sequência no período.</p>
        </>
      ),
    })
  }

  const top = data.pessoas.filter((p) => p.pontos > 0).slice(0, 3)
  if (top.length >= 2) {
    const order = [top[1], top[0], top[2]].filter(Boolean) as RetroPerson[]
    slides.push({
      id: 'podio',
      tone: 'tone-podium',
      body: (
        <>
          <p className="retro-eyebrow">Pódio {period.kind === 'semana' ? 'da semana' : 'do mês'}</p>
          <h2 className="retro-title small">Quem puxou o grupo</h2>
          <div className="retro-podium">
            {order.map((p) => {
              const m = members.find((x) => x.id === p.user_id)
              const place = p.posicao
              return (
                <div key={p.user_id} className={`podium-col p${Math.min(place, 3)} ${p.user_id === userId ? 'me' : ''}`}>
                  <Avatar name={p.username} url={m?.avatar_url} size="lg" />
                  <span className="podium-name">{p.username}</span>
                  <span className="podium-pts">{p.pontos} pts</span>
                  <span className="podium-block">{place}º</span>
                </div>
              )
            })}
          </div>
        </>
      ),
    })
  }

  const share = async () => {
    const text = `Minha ${period.kind === 'semana' ? 'semana' : 'retrospectiva do mês'} no Streak: ${total} dias com prova, ${me.pontos} pontos${me.paginas ? `, ${me.paginas} páginas lidas` : ''}.`
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
    } catch {
      /* cancelou */
    }
  }

  slides.push({
    id: 'resumo',
    tone: 'tone-summary',
    body: (
      <>
        <p className="retro-eyebrow">Resumo · {periodLabel(period)}</p>
        <h2 className="retro-title small">{title}</h2>
        <dl className="retro-summary">
          <div>
            <dt>Dias com prova</dt>
            <dd>{total}</dd>
          </div>
          <div>
            <dt>Pontos</dt>
            <dd>{fmt(me.pontos)}</dd>
          </div>
          <div>
            <dt>Posição</dt>
            <dd>{me.pontos > 0 ? `${me.posicao}º` : '–'}</dd>
          </div>
          <div>
            <dt>Páginas</dt>
            <dd>{fmt(me.paginas)}</dd>
          </div>
          <div>
            <dt>Livros</dt>
            <dd>{me.livros}</dd>
          </div>
          <div>
            <dt>Maior sequência</dt>
            <dd>{best}</dd>
          </div>
        </dl>
        <button className="retro-share" onClick={share}>
          <Share2 size={18} aria-hidden /> Compartilhar
        </button>
      </>
    ),
  })
  return slides
}

/** Pontos acumulados dia a dia: você contra a média de quem postou. */
function PointsLine({ days, data, userId, ativos }: { days: string[]; data: RetroData; userId: string; ativos: number }) {
  const until = days.filter((d) => d <= data.fim)
  if (until.length < 2) return null
  const mineBy = new Map(data.dias.filter((d) => d.user_id === userId).map((d) => [d.day, d.pts]))
  const groupBy = new Map<string, number>()
  for (const d of data.dias) groupBy.set(d.day, (groupBy.get(d.day) ?? 0) + d.pts)
  let a = 0
  let b = 0
  const mine = until.map((d) => (a += mineBy.get(d) ?? 0))
  const avg = until.map((d) => (b += (groupBy.get(d) ?? 0) / Math.max(1, ativos)))
  const max = Math.max(1, ...mine, ...avg)
  const W = 300
  const H = 120
  const x = (i: number) => (i / (until.length - 1)) * W
  const y = (v: number) => H - (v / max) * (H - 8) - 4
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="retro-line">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path d={`${path(mine)} L${W},${H} L0,${H}Z`} className="area" />
        <path d={path(avg)} className="avg" />
        <path d={path(mine)} className="mine" pathLength={1} />
      </svg>
      <p className="retro-legend dark">
        <span>
          <i className="me" /> você
        </span>
        <span>
          <i /> média do grupo
        </span>
      </p>
    </div>
  )
}

function CompareRow({ label, mine, avg }: { label: string; mine: number; avg: number }) {
  const max = Math.max(1, mine, avg)
  return (
    <div className="compare-row">
      <span className="compare-label">{label}</span>
      <div className="compare-bars">
        <span className="me" style={{ width: `${(mine / max) * 100}%` }}>
          <em>{fmt(mine)}</em>
        </span>
        <span style={{ width: `${(avg / max) * 100}%` }}>
          <em>{avg % 1 && avg < 10 ? avg.toFixed(1).replace('.', ',') : fmt(avg)}</em>
        </span>
      </div>
    </div>
  )
}

/** Pontos de cada semana (segunda a domingo) dentro do mês. */
function weeksOf(days: string[], myDays: RetroDay[]) {
  const pts = new Map(myDays.map((d) => [d.day, d.pts]))
  const weeks: { label: string; pts: number }[] = []
  let cur: { start: string; end: string; pts: number } | null = null
  for (const d of days) {
    if (!cur || weekdayOf(d) === 1) {
      if (cur) weeks.push({ label: `${Number(cur.start.slice(8))}–${Number(cur.end.slice(8))}`, pts: cur.pts })
      cur = { start: d, end: d, pts: 0 }
    }
    cur.end = d
    cur.pts += pts.get(d) ?? 0
  }
  if (cur) weeks.push({ label: `${Number(cur.start.slice(8))}–${Number(cur.end.slice(8))}`, pts: cur.pts })
  return weeks
}
