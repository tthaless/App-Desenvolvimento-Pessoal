import { useState } from 'react'
import { Check, Lock, Pin } from 'lucide-react'
import { BADGES, BADGE_GROUPS, TIER_NAME, badgeById, progressOf, saveFeatured, unitOf, useBadgeStats } from '../lib/badges'
import type { BadgeProgress, BadgeStats } from '../lib/badges'
import { refreshMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import type { Member } from '../types'
import BadgeMedal from './BadgeMedal'
import Sheet from './Sheet'
import { SkeletonRows } from './Skeleton'

const fmt = (n: number) => n.toLocaleString('pt-BR')

/** Aba de insígnias do perfil: todas, por grupo, com o progresso de cada uma. */
export default function Badges({ member, isMe }: { member: Member; isMe: boolean }) {
  const stats = useBadgeStats(member.id)
  const [open, setOpen] = useState<string | null>(null)

  if (stats === 'erro') return <p className="msg error">Não deu pra carregar as insígnias agora.</p>
  if (!stats) return <SkeletonRows count={4} />

  const all = BADGES.map((d) => progressOf(d, stats))
  const earned = all.filter((p) => p.level > 0).length
  const selected = open ? all.find((p) => p.def.id === open) : null

  return (
    <div className="badges">
      <section className="badges-summary card">
        <div>
          <p className="badges-count">
            {earned}
            <span>/{all.length}</span>
          </p>
          <p className="muted small">insígnias conquistadas</p>
        </div>
        {isMe && <p className="muted small badges-tip">Toque numa insígnia conquistada pra destacar no topo do perfil. Até 3.</p>}
      </section>

      {BADGE_GROUPS.map((g) => (
        <section key={g} className="badge-group">
          <h3 className="settings-label">{g}</h3>
          <ul className="badge-grid">
            {all
              .filter((p) => p.def.group === g)
              .map((p) => (
                <li key={p.def.id}>
                  <button className={`badge-cell ${p.level ? '' : 'locked'}`} onClick={() => setOpen(p.def.id)}>
                    <BadgeMedal icon={p.def.icon} tier={p.tier} levels={p.def.goals.length} level={p.level} size={62} />
                    <span className="badge-name">{p.def.name}</span>
                    <span className="badge-state">
                      {p.tier ? (p.def.goals.length > 1 ? TIER_NAME[p.tier] : 'Conquistada') : `${fmt(Math.min(p.value, p.def.goals[0]))}/${fmt(p.def.goals[0])}`}
                    </span>
                    {member.featured_badges?.includes(p.def.id) && (
                      <span className="badge-pin" aria-label="Em destaque">
                        <Pin size={11} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {selected && <BadgeSheet progress={selected} member={member} isMe={isMe} onClose={() => setOpen(null)} />}
    </div>
  )
}

function BadgeSheet({ progress, member, isMe, onClose }: { progress: BadgeProgress; member: Member; isMe: boolean; onClose: () => void }) {
  const { def, value, level, tier, next } = progress
  const featured = member.featured_badges ?? []
  const isFeatured = featured.includes(def.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prev = def.goals[level - 1] ?? 0
  const pct = next ? Math.max(0, Math.min(100, ((value - prev) / (next - prev)) * 100)) : 100

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      await saveFeatured(member.id, isFeatured ? featured.filter((f) => f !== def.id) : [...featured, def.id])
      await refreshMembers()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet title={def.name} onClose={onClose} className="badge-sheet">
      <div className="badge-hero">
        <BadgeMedal icon={def.icon} tier={tier} levels={def.goals.length} level={level} size={120} label={def.name} />
        <p className="badge-hero-tier">{tier ? (def.goals.length > 1 ? `Nível ${TIER_NAME[tier]}` : 'Conquistada') : 'Ainda não conquistada'}</p>
        <p className="muted small center">{def.hint}</p>
      </div>

      <div className="badge-progress">
        <div className="badge-progress-top">
          <strong>{fmt(value)}</strong>
          <span className="muted small">{unitOf(def, value)}</span>
        </div>
        {next && (
          <>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="muted small">
              Faltam {fmt(next - value)} pro {def.goals.length > 1 ? `nível ${TIER_NAME[Math.min(4, level + 1) as 1 | 2 | 3 | 4]}` : 'objetivo'}
            </p>
          </>
        )}
      </div>

      {def.goals.length > 1 && (
        <ol className="badge-levels">
          {def.goals.map((g, i) => {
            const t = (i + 1) as 1 | 2 | 3 | 4
            const got = level > i
            return (
              <li key={g} className={got ? 'got' : ''}>
                <BadgeMedal icon={def.icon} tier={got ? t : null} size={30} />
                <span className="badge-level-name">{TIER_NAME[t]}</span>
                <span className="muted small">
                  {fmt(g)} {unitOf(def, g)}
                </span>
                {got ? <Check size={16} className="badge-level-check" aria-label="conquistado" /> : <Lock size={14} className="muted" aria-label="bloqueado" />}
              </li>
            )
          })}
        </ol>
      )}

      {isMe && level > 0 && (
        <>
          {error && <p className="msg error">{error}</p>}
          <button className={`btn ${isFeatured ? 'ghost' : 'primary'} full`} onClick={toggle} disabled={busy || (!isFeatured && featured.length >= 3)}>
            <Pin size={17} aria-hidden /> {isFeatured ? 'Tirar do destaque' : featured.length >= 3 ? 'Já tem 3 em destaque' : 'Destacar no perfil'}
          </button>
        </>
      )}
    </Sheet>
  )
}

/** Até 3 insígnias escolhidas, no topo do perfil, perto do nome. */
export function FeaturedBadges({ member }: { member: Member }) {
  const ids = member.featured_badges ?? []
  const stats = useBadgeStats(member.id)
  const [open, setOpen] = useState<string | null>(null)
  if (!ids.length || !stats || stats === 'erro') return null
  const items = ids
    .map((id) => badgeById(id))
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => progressOf(d, stats as BadgeStats))
    .filter((p) => p.level > 0)
  if (!items.length) return null
  const selected = open ? items.find((p) => p.def.id === open) : null
  return (
    <>
      <ul className="featured-badges" aria-label="Insígnias em destaque">
        {items.map((p) => (
          <li key={p.def.id}>
            <button onClick={() => setOpen(p.def.id)} aria-label={`${p.def.name}${p.tier && p.def.goals.length > 1 ? `, ${TIER_NAME[p.tier]}` : ''}`}>
              <BadgeMedal icon={p.def.icon} tier={p.tier} size={40} />
            </button>
          </li>
        ))}
      </ul>
      {selected && <BadgeSheet progress={selected} member={member} isMe={false} onClose={() => setOpen(null)} />}
    </>
  )
}
