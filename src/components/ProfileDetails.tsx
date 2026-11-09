import type { Member, StreakRow } from '../types'
import StreakCard from './StreakCard'
import { pinsOf } from '../lib/pins'
import { BookOpen, Dumbbell } from 'lucide-react'
import MonthCalendar from './MonthCalendar'
import BookCover from './BookCover'
import { ReadingProgress } from './ReadingProgress'

/** Livro, exercícios e streaks: parte comum do meu perfil e do perfil dos amigos. */
export default function ProfileDetails({ member, streaks }: { member: Member; streaks: StreakRow[] }) {
  const pins = pinsOf(member)
  return (
    <>
      {pins.includes('sequencias') && <StreakCard streaks={streaks} />}

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

      {pins.includes('calendario') && <MonthCalendar userId={member.id} />}
    </>
  )
}

