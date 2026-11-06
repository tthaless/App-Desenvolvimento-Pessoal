import { ACTIVITY } from '../types'
import type { Activity, Member, StreakRow } from '../types'

interface Props {
  member: Member
  streaks: StreakRow[]
  /** No meu perfil o livro atual tem um card próprio, com os botões. */
  hideBook?: boolean
}

/** Livro, exercícios e streaks: parte comum do meu perfil e do perfil dos amigos. */
export default function ProfileDetails({ member, streaks, hideBook }: Props) {
  const activities: Activity[] = ['exercicio', 'leitura']
  return (
    <>
      <div className="stat-grid">
        {activities.map((a) => {
          const s = streaks.find((r) => r.activity === a)
          return (
            <section key={a} className={`card stat act-${a}`}>
              <p className="muted small">
                {ACTIVITY[a].emoji} {ACTIVITY[a].label}
              </p>
              <p className="stat-big">🔥 {s?.current_streak ?? 0}</p>
              <p className="muted small">Recorde: {s?.best_streak ?? 0}</p>
            </section>
          )
        })}
      </div>

      <section className="card info-list">
        {!hideBook && <div className="info act-leitura">
          <span className="info-icon" aria-hidden>📖</span>
          <div>
            <p className="muted small">Lendo agora</p>
            <p className="info-value">{member.current_book || <span className="muted">Nenhum livro em andamento</span>}</p>
          </div>
        </div>}
        <div className="info act-exercicio">
          <span className="info-icon" aria-hidden>🏋️</span>
          <div>
            <p className="muted small">Exercícios</p>
            <p className="info-value">{member.exercises || <span className="muted">Nada informado</span>}</p>
          </div>
        </div>
      </section>
    </>
  )
}
