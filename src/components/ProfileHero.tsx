import type { ReactNode } from 'react'

interface Props {
  coverUrl: string | null
  /** Botão no canto do plano de fundo (trocar), só no próprio perfil. */
  corner?: ReactNode
  /** Foto de perfil (pode vir com o botão de trocar). */
  avatar: ReactNode
  /** Ação abaixo do plano de fundo, à direita (ex.: Editar perfil). */
  action?: ReactNode
  name: string
  badges?: ReactNode
  bio?: ReactNode
  stats?: ReactNode
  /** Inputs escondidos e outras coisas sem lugar visual. */
  children?: ReactNode
}

/** Topo do perfil: plano de fundo grande, com a foto e o nome por cima da parte de baixo. */
export default function ProfileHero({ coverUrl, corner, avatar, action, name, badges, bio, stats, children }: Props) {
  return (
    <section className={`phero ${coverUrl ? 'has-cover' : 'no-cover'}`}>
      <div className="phero-cover" style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}>
        <span className="phero-scrim" aria-hidden />
        {corner && <div className="phero-corner">{corner}</div>}
        <div className="phero-id">
          <div className="phero-avatar">{avatar}</div>
          <div className="phero-id-text">
            <h2 className="phero-name">{name}</h2>
            {badges}
          </div>
        </div>
      </div>
      <div className="phero-main">
        <div className="phero-action">{action}</div>
        {bio}
        {stats}
      </div>
      {children}
    </section>
  )
}
