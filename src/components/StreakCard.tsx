import type { ReactNode } from 'react'
import { ACTIVITY } from '../types'
import type { Activity, StreakRow } from '../types'
import ActivityIcon from './ActivityIcon'

/** Sequência atual e recorde de exercício e leitura. */
export default function StreakCard({ streaks, action }: { streaks: StreakRow[]; action?: ReactNode }) {
  const activities: Activity[] = ['exercicio', 'leitura']
  return (
    <section className="card streak-card" aria-label="Sequências">
      <div className="card-head">
        <h3 className="card-title">Sequências</h3>
        {action}
      </div>
      {activities.map((a) => {
        const st = streaks.find((r) => r.activity === a)
        const cur = st?.current_streak ?? 0
        const best = Math.max(st?.best_streak ?? 0, cur)
        return (
          <div key={a} className={`streak-row act-${a}`}>
            <span className="streak-icon">
              <ActivityIcon activity={a} size={18} />
            </span>
            <div className="streak-text">
              <span className="streak-name">{ACTIVITY[a].label}</span>
              <div className="meter small" aria-hidden>
                <span style={{ width: `${best ? (cur / best) * 100 : 0}%` }} />
              </div>
              <span className="streak-best">
                {cur > 0 && cur >= best ? 'No recorde agora' : `Recorde: ${best} ${best === 1 ? 'dia' : 'dias'}`}
              </span>
            </div>
            <span className="streak-now">
              <strong>{cur}</strong>
              <small>{cur === 1 ? 'dia' : 'dias'}</small>
            </span>
          </div>
        )
      })}
    </section>
  )
}
