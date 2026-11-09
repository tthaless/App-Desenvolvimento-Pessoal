import { ACTIVITY } from '../types'
import type { Activity, Member, StreakRow } from '../types'
import { BookOpen, Dumbbell } from 'lucide-react'
import ActivityIcon from './ActivityIcon'
import MonthCalendar from './MonthCalendar'
import BookCover from './BookCover'
import { ReadingProgress } from './ReadingProgress'

/** Livro, exercícios e streaks: parte comum do meu perfil e do perfil dos amigos. */
export default function ProfileDetails({ member, streaks }: { member: Member; streaks: StreakRow[] }) {
  const activities: Activity[] = ['exercicio', 'leitura']
  return (
    <>
      <section className="card streak-card" aria-label="Sequências">
        <h3 className="card-title">Sequências</h3>
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
                <span className="streak-best">{cur > 0 && cur >= best ? 'No recorde agora' : `Recorde: ${best} ${best === 1 ? 'dia' : 'dias'}`}</span>
              </div>
              <span className="streak-now">
                <strong>{cur}</strong>
                <small>{cur === 1 ? 'dia' : 'dias'}</small>
              </span>
            </div>
          )
        })}
      </section>

      <section className="card info-list">
        <div className="info act-leitura info-book">
          {member.current_book ? (
            <BookCover url={member.current_book_cover ?? null} title={member.current_book} size="sm" />
          ) : (
            <span className="info-icon" aria-hidden>
              <BookOpen size={18} />
            </span>
          )}
          <div>
            <p className="muted small">Lendo agora</p>
            <p className="info-value">{member.current_book || <span className="muted">Nenhum livro ainda</span>}</p>
            {member.current_book_author && <p className="muted small">{member.current_book_author}</p>}
            {member.current_book && <ReadingProgress page={member.current_book_page} total={member.current_book_total_pages} />}
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

      <MonthCalendar userId={member.id} />
    </>
  )
}

