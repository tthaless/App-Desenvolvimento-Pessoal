import { Hammer } from 'lucide-react'
import { signOut } from '../lib/account'
import { ArrowMark } from './Logo'

/** Tela pra quem entra enquanto o app está em manutenção. */
export default function Maintenance({ name }: { name?: string }) {
  return (
    <div className="maintenance">
      <ArrowMark size={72} />
      <span className="maintenance-badge">
        <Hammer size={15} aria-hidden /> Em manutenção
      </span>
      <h1>{name ? `Já já, ${name}!` : 'Já já!'}</h1>
      <p>
        O Streak está ganhando uma cara nova. Os pontos e as sequências foram zerados pra todo mundo começar junto quando a nova versão sair.
      </p>
      <p className="muted small">Avisamos no grupo assim que liberar. Seu perfil, foto e bio continuam salvos.</p>
      <button className="link-btn" onClick={() => signOut()}>
        Sair da conta
      </button>
    </div>
  )
}
