import { useId } from 'react'
import {
  BookMarked,
  CalendarCheck,
  Crown,
  Dumbbell,
  Feather,
  Flame,
  Lamp,
  Layers,
  Moon,
  NotebookPen,
  Rocket,
  Sparkles,
  Sunrise,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BadgeIcon, Tier } from '../lib/badges'

const ICONS: Record<BadgeIcon, LucideIcon> = {
  crown: Crown,
  trophy: Trophy,
  flame: Flame,
  'flame-book': Lamp,
  book: BookMarked,
  pages: Layers,
  feather: Feather,
  notes: NotebookPen,
  rocket: Rocket,
  dumbbell: Dumbbell,
  combo: Sparkles,
  sunrise: Sunrise,
  moon: Moon,
  calendar: CalendarCheck,
}

// Metal de cada nível: [claro, médio, escuro, cor do ícone]
const METAL: Record<Tier | 0, [string, string, string, string]> = {
  0: ['#4a4a52', '#3a3a42', '#2c2c33', '#6c6c76'],
  1: ['#f0b787', '#c47a43', '#7a4521', '#f6c9a2'],
  2: ['#f4f6fa', '#b9c0cc', '#6f7787', '#e8ecf2'],
  3: ['#fff1a8', '#f2c14a', '#a8701a', '#ffe28a'],
  4: ['#d9fbff', '#7fd8ff', '#7a5cff', '#c9f4ff'],
}

// Hexágono de pé, com cantos arredondados.
const OUTER = 'M32 2.5 L57 16.5 Q59 17.7 59 20 L59 44 Q59 46.3 57 47.5 L32 61.5 Q30 62.6 28 61.5 L7 47.5 Q5 46.3 5 44 L5 20 Q5 17.7 7 16.5 L28 2.5 Q30 1.4 32 2.5Z'
const INNER = 'M32 9 L52 20.2 L52 43.8 L32 55 L12 43.8 L12 20.2Z'

interface Props {
  icon: BadgeIcon
  /** null = ainda bloqueada. */
  tier: Tier | null
  /** Quantos níveis a insígnia tem e em qual a pessoa está (pontinhos embaixo). */
  levels?: number
  level?: number
  size?: number
  label?: string
}

/** Medalha hexagonal de metal (bronze, prata, ouro, diamante) com o símbolo da insígnia. */
export default function BadgeMedal({ icon, tier, levels = 1, level = 0, size = 56, label }: Props) {
  const uid = useId().replace(/:/g, '')
  const [light, mid, dark, ink] = METAL[tier ?? 0]
  const Icon = ICONS[icon]
  const locked = tier === null
  return (
    <svg
      className={`badge-medal ${locked ? 'locked' : `tier-${tier}`}`}
      width={size}
      height={size}
      viewBox="0 0 64 68"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset=".55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`c${uid}`} cx=".5" cy=".35" r=".75">
          <stop offset="0" stopColor={locked ? '#2a2a30' : '#2e2a2a'} />
          <stop offset="1" stopColor="#141417" />
        </radialGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={OUTER} fill={`url(#m${uid})`} stroke={dark} strokeWidth="1" />
      <path d={INNER} fill={`url(#c${uid})`} stroke={dark} strokeOpacity=".6" strokeWidth="1" />
      {!locked && <path d="M12 20.2 L32 9 L52 20.2 L52 27 Q32 19 12 27Z" fill={`url(#s${uid})`} opacity=".35" />}
      <Icon x={20} y={20} width={24} height={24} color={ink} strokeWidth={2.1} />
      {tier === 4 && (
        <path d="M50 8 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4z" fill="#fff" opacity=".9" />
      )}
      {levels > 1 &&
        Array.from({ length: levels }, (_, i) => {
          const x = 32 + (i - (levels - 1) / 2) * 6
          return <circle key={i} cx={x} cy={66} r={2} fill={i < level ? light : '#3a3a42'} />
        })}
    </svg>
  )
}
