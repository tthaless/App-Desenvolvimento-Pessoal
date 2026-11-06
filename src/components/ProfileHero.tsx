import type { ReactNode } from 'react'

interface Props {
  coverUrl: string | null
  /** Botão no canto (trocar o plano de fundo), só no próprio perfil. */
  corner?: ReactNode
  children: ReactNode
}

/** Topo do perfil: plano de fundo escolhido pela pessoa, com foto e nome por cima. */
export default function ProfileHero({ coverUrl, corner, children }: Props) {
  return (
    <section className={`profile-hero ${coverUrl ? 'has-cover' : ''}`}>
      {coverUrl && (
        <div className="hero-cover" aria-hidden>
          <img src={coverUrl} alt="" />
        </div>
      )}
      {corner && <div className="hero-corner">{corner}</div>}
      <div className="hero-content profile-top">{children}</div>
    </section>
  )
}
