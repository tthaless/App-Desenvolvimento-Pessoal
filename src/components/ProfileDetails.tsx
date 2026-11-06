import { ACTIVITY } from '../types'
import type { Activity, Member, StreakRow } from '../types'
import { BookOpen, Dumbbell } from 'lucide-react'
import ActivityIcon from './ActivityIcon'
import { FlameMark } from './Logo'
import MonthCalendar from './MonthCalendar'

/** Livro, exercícios e streaks: parte comum do meu perfil e do perfil dos amigos. */
export default function ProfileDetails({ member, streaks }: { member: Member; streaks: StreakRow[] }) {
  const activities: Activity[] = ['exercicio', 'leitura']
  return (
    <>
      <div className="stat-grid">
        {activities.map((a) => {
          const s = streaks.find((r) => r.activity === a)
          return (
            <section key={a} className={`card stat act-${a}`}>
              <p className="muted small stat-label">
                <ActivityIcon activity={a} size={14} /> {ACTIVITY[a].label}
              </p>
              <p className="stat-big">
                <FlameMark size={26} /> {s?.current_streak ?? 0}
              </p>
              <p className="muted small">Recorde: {s?.best_streak ?? 0}</p>
            </section>
          )
        })}
      </div>

      <MonthCalendar userId={member.id} />

      <section className="card info-list">
        <div className="info act-leitura">
          <span className="info-icon" aria-hidden>
            <BookOpen size={18} />
          </span>
          <div>
            <p className="muted small">Lendo agora</p>
            <p className="info-value">{member.current_book || <span className="muted">Nenhum livro ainda</span>}</p>
          </div>
        </div>
        <div className="info act-exercicio">
          <span className="info-icon" aria-hidden>
            <Dumbbell size={18} />
          </span>
          <div>
            <p className="muted small">Exercícios</p>
            <p className="info-value">{member.exercises || <span className="muted">Nada informado</span>}</p>
          </div>
        </div>
      </section>
    </>
  )
}
