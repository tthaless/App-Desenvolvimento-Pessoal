import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Camera, Dumbbell, Trophy, UserRound } from 'lucide-react'
import { ArrowMark, FlameMark } from './Logo'

const KEY = (userId: string) => `streak:boas-vindas:${userId}`

export function shouldShowWelcome(userId: string): boolean {
  try {
    return !localStorage.getItem(KEY(userId))
  } catch {
    return false
  }
}

function markSeen(userId: string) {
  try {
    localStorage.setItem(KEY(userId), '1')
  } catch {
    /* tudo bem */
  }
}

interface Step {
  art: ReactNode
  title: string
  text: ReactNode
}

const STEPS: Step[] = [
  {
    art: <ArrowMark size={84} />,
    title: 'Bem-vindo ao Streak',
    text: (
      <>
        Todo dia, poste uma <strong>foto como prova</strong> do seu treino e da sua leitura: toque na <strong>câmera</strong> no meio da
        barra de baixo, tire a foto e escolha a atividade. Ela fica nos stories do grupo por 24h.
      </>
    ),
  },
  {
    art: <FlameMark size={84} />,
    title: 'Mantenha o streak',
    text: (
      <>
        Cada dia seguido aumenta o seu streak. A partir do <strong>3º dia</strong>, cada prova vale <strong>pontos extras</strong>.
        Sábado e domingo são livres: postar soma, faltar não quebra.
      </>
    ),
  },
  {
    art: (
      <span className="welcome-trophy">
        <Trophy size={64} strokeWidth={1.6} />
      </span>
    ),
    title: 'Ranking e insígnias',
    text: (
      <>
        <strong>10 pontos</strong> por atividade no dia e <strong>+5</strong> fazendo as duas. Terminou um livro com resumo ou PDF de
        anotações? <strong>+30</strong>. Vitórias, streaks e leituras viram <strong>insígnias</strong> no seu perfil.
      </>
    ),
  },
  {
    art: (
      <span className="welcome-icons">
        <Dumbbell size={34} />
        <BookOpen size={34} />
        <Camera size={34} />
      </span>
    ),
    title: 'Monte o seu perfil',
    text: (
      <>
        Coloque uma <strong>foto</strong>, cadastre o <strong>livro</strong> que está lendo em Leitura → Biblioteca e, no celular, instale o Streak
        na tela inicial pra abrir como app.
      </>
    ),
  },
]

/** Telinhas de boas-vindas, uma vez por pessoa em cada aparelho. */
export default function Welcome({ userId, onGoToProfile, onClose }: { userId: string; onGoToProfile: () => void; onClose: () => void }) {
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  const step = STEPS[i]

  function finish(goProfile = false) {
    markSeen(userId)
    onClose()
    if (goProfile) onGoToProfile()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !last) setI(i + 1)
      if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Boas-vindas">
      {!last && (
        <button className="welcome-skip" onClick={() => finish()}>
          Pular
        </button>
      )}
      <div className="welcome-body" key={i}>
        <div className="welcome-art">{step.art}</div>
        <h2>{step.title}</h2>
        <p>{step.text}</p>
      </div>
      <div className="welcome-dots" aria-hidden>
        {STEPS.map((_, n) => (
          <span key={n} className={n === i ? 'on' : ''} />
        ))}
      </div>
      <div className="welcome-actions">
        {last ? (
          <>
            <button className="btn ghost" onClick={() => finish(true)}>
              <UserRound size={18} aria-hidden /> Ir pro meu perfil
            </button>
            <button className="btn primary" onClick={() => finish()}>
              Começar
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={() => setI(i - 1)} disabled={i === 0}>
              Voltar
            </button>
            <button className="btn primary" onClick={() => setI(i + 1)}>
              Próximo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
