import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  text?: ReactNode
  action?: ReactNode
  /** Sem caixa em volta (dentro de um cartão que já existe). */
  bare?: boolean
  tone?: 'brand' | 'reading' | 'gold' | 'ok'
}

/** Tela vazia com símbolo, frase e o que fazer em seguida. */
export default function EmptyState({ icon, title, text, action, bare, tone = 'brand' }: Props) {
  return (
    <div className={`empty-state tone-${tone} ${bare ? 'bare' : 'card'}`}>
      <span className="empty-state-art" aria-hidden>
        <span className="empty-state-ring" />
        {icon}
      </span>
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
