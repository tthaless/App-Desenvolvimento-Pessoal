import { BADGES, progressOf, useBadgeStats } from '../lib/badges'

/** Números do perfil numa linha, como nos apps de rede social. */
export default function ProfileStats({ userId }: { userId: string }) {
  const stats = useBadgeStats(userId)
  const ok = stats && stats !== 'erro' ? stats : null
  // Totais (as sequências atuais ficam no cartão Sequências, logo abaixo).
  const items: [number | string, string][] = [
    [ok ? ok.dias_exercicio : '–', 'dias de treino'],
    [ok ? ok.dias_leitura : '–', 'dias de leitura'],
    [ok ? ok.livros : '–', 'livros lidos'],
    [ok ? BADGES.filter((d) => progressOf(d, ok).level > 0).length : '–', 'insígnias'],
  ]
  return (
    <dl className="pstats">
      {items.map(([v, label]) => (
        <div key={label}>
          <dd>{v}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  )
}
