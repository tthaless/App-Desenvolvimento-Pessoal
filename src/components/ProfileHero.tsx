import type { ReactNode } from 'react'

interface Props {
  coverUrl: string | null
  /** Botão no canto do plano de fundo (trocar), só no próprio perfil. */
  corner?: ReactNode
  /** Foto de perfil (pode vir com o botão de trocar). */
  avatar: ReactNode
  /** Ação ao lado da foto (ex.: Editar perfil). */
  action?: ReactNode
  name: string
  badges?: ReactNode
  bio?: ReactNode
  stats?: ReactNode
  /** Inputs escondidos e outras coisas sem lugar visual. */
  children?: ReactNode
}

/** Topo do perfil: plano de fundo inteiro em cima, foto sobreposta, nome, insígnias, bio e números. */
export default function ProfileHero({ coverUrl, corner, avatar, action, name, badges, bio, stats, children }: Props) {
  return (
    <section className="phero">
      <div className={`phero-cover ${coverUrl ? '' : 'empty'}`} style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}>
        {corner && <div className="phero-corner">{corner}</div>}
      </div>
      <div className="phero-main">
        <div className="phero-row">
          <div className="phero-avatar">{avatar}</div>
          {action && <div className="phero-action">{action}</div>}
        </div>
        <h2 className="phero-name">{name}</h2>
        {badges}
        {bio}
        {stats}
      </div>
      {children}
    </section>
  )
}
