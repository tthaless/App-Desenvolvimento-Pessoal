import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todaySP } from '../lib/utils'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

type Level = 0 | 1 | 2

/** Constância do mês atual: um quadradinho por dia, mais forte quando fez exercício e leitura. Todo mês começa do zero. */
export default function MonthCalendar({ userId }: { userId: string }) {
  const today = todaySP()
  const [year, month] = today.split('-').map(Number)
  const first = `${today.slice(0, 7)}-01`
  const [days, setDays] = useState<Record<string, Set<string>> | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('posts')
      .select('day,activity')
      .eq('user_id', userId)
      .gte('day', first)
      .then(({ data }) => {
        if (!active) return
        const map: Record<string, Set<string>> = {}
        for (const r of (data ?? []) as { day: string; activity: string }[]) (map[r.day] ??= new Set()).add(r.activity)
        setDays(map)
      })
    return () => {
      active = false
    }
  }, [userId, first])

  const cells = useMemo(() => {
    const total = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const list: ({ day: string; n: number } | null)[] = Array(offset).fill(null)
    for (let n = 1; n <= total; n++) list.push({ day: `${today.slice(0, 7)}-${String(n).padStart(2, '0')}`, n })
    return list
  }, [year, month, today])

  const level = (day: string): Level => (days?.[day]?.size ?? 0) as Level
  const active = days ? Object.keys(days).length : 0

  const pickedInfo = picked && days ? days[picked] : null
  const describe = (d: string) => {
    const s = days?.[d]
    const [, , dd] = d.split('-')
    if (!s || s.size === 0) return `Dia ${Number(dd)}: sem prova`
    if (s.size >= 2) return `Dia ${Number(dd)}: exercício e leitura`
    return `Dia ${Number(dd)}: ${s.has('exercicio') ? 'exercício' : 'leitura'}`
  }

  return (
    <section className="card month-cal" aria-label={`Constância em ${MONTHS[month - 1]}`}>
      <header className="month-cal-head">
        <h3>{MONTHS[month - 1]}</h3>
        {days && (
          <span className="muted small">
            {active} {active === 1 ? 'dia' : 'dias'} com prova
          </span>
        )}
      </header>

      <div className="month-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <span key={`w${i}`} className="month-wd" aria-hidden>
            {w}
          </span>
        ))}
        {cells.map((c, i) =>
          c ? (
            <button
              key={c.day}
              type="button"
              className={`month-day lv${days ? level(c.day) : 0} ${c.day === today ? 'today' : ''} ${c.day > today ? 'future' : ''} ${picked === c.day ? 'picked' : ''}`}
              disabled={c.day > today}
              onClick={() => setPicked(picked === c.day ? null : c.day)}
              aria-label={describe(c.day)}
            />
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>

      <footer className="month-cal-foot">
        {picked ? (
          <span className={`small ${pickedInfo?.size ? '' : 'muted'}`}>{describe(picked)}</span>
        ) : (
          <span className="month-legend muted small">
            <span>
              <i className="month-day lv0" /> nada
            </span>
            <span>
              <i className="month-day lv1" /> uma atividade
            </span>
            <span>
              <i className="month-day lv2" /> as duas
            </span>
          </span>
        )}
      </footer>
    </section>
  )
}
