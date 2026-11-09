import { useBadgeStats } from '../lib/badges'
import { PIN_STATS, pinsOf } from '../lib/pins'
import type { Member } from '../types'

/** Números que a pessoa fixou no perfil. Sem nada fixado, não aparece. */
export default function ProfileStats({ member }: { member: Member }) {
  const pins = pinsOf(member)
  const chosen = PIN_STATS.filter((p) => pins.includes(p.id))
  const stats = useBadgeStats(member.id)
  if (!chosen.length) return null
  const ok = stats && stats !== 'erro' ? stats : null
  return (
    <dl className={`pstats n${chosen.length}`}>
      {chosen.map((p) => (
        <div key={p.id}>
          <dd>{ok ? p.value(ok).toLocaleString('pt-BR') : '–'}</dd>
          <dt>{p.label}</dt>
        </div>
      ))}
    </dl>
  )
}
