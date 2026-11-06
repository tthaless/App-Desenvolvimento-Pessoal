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
        // Fundo pintado direto no bloco: no Safari, uma <img> dentro da janela que sobe
        // animada às vezes só aparecia depois de outro toque na tela.
        <div className="hero-cover" aria-hidden style={{ backgroundImage: `url("${coverUrl}")` }} />
      )}
      {corner && <div className="hero-corner">{corner}</div>}
      <div className="hero-content profile-top">{children}</div>
    </section>
  )
}
