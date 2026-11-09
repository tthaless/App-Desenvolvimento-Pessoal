import { useId } from 'react'

/** Foguinho da sequência de dias. */
export function FlameMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`flame-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M33 4c2 10 15 16 15 32a16 16 0 0 1-32 0c0-8 4.5-12.5 7-16 1 5.5 3.5 8 5.5 9-1-10 1.5-17 4.5-25z" fill="var(--flame)" />
      <path d="M32 33c1.2 4.5 6.5 6.5 6.5 13a6.5 6.5 0 0 1-13 0c0-3.5 2-5.5 3.3-6.5 0 2.2 1 3.3 2.2 3.3-.2-4.3.2-6.8 1-9.8z" fill="#f5b544" />
    </svg>
  )
}

const FLASK = 'M60 12 L91 60 Q94 66 87 66 H70 V104 Q70 110 64 110 H56 Q50 110 50 104 V66 H33 Q26 66 29 60 Z'
const LEVEL = 46

/** Esferas de XP entrando pela ponta da seta: [x, y, raio, cor, brilho]. */
const ORBS_FULL: [number, number, number, string, boolean][] = [
  [24, 30, 7.5, '#f2b632', true],
  [96, 22, 6, '#f2b632', true],
  [40, 10, 3.5, '#e07b2e', false],
  [104, 44, 2.6, '#e07b2e', false],
]
const ORBS_SMALL: [number, number, number, string, boolean][] = [
  [22, 32, 9, '#f2b632', false],
  [96, 22, 7.5, '#f2b632', false],
  [40, 9, 4.5, '#e07b2e', false],
]

/** Frasco em forma de seta enchendo de experiência (líquido dourado e esferas de XP), a marca do app. */
export function ArrowMark({ size = 24, className = '', stroke = 'var(--text)' }: { size?: number; className?: string; stroke?: string }) {
  const uid = useId().replace(/:/g, '')
  // Em tamanhos pequenos: menos esferas, maiores, sem rastro nem bolhas, e contorno mais grosso.
  const small = size < 40
  const orbs = small ? ORBS_SMALL : ORBS_FULL
  return (
    <svg className={`arrow-mark ${className}`} width={size} height={size} viewBox="0 0 116 116" aria-hidden>
      <defs>
        <linearGradient id={`xp${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7c84a" />
          <stop offset="1" stopColor="#d9861c" />
        </linearGradient>
        <clipPath id={`fl${uid}`}>
          <path d={FLASK} />
        </clipPath>
      </defs>
      {!small && <path d={FLASK} fill="#f7c84a" opacity=".16" transform="translate(60 60) scale(1.12) translate(-60 -60)" />}
      <g clipPath={`url(#fl${uid})`}>
        <rect x="20" y={LEVEL} width="80" height={120 - LEVEL} fill={`url(#xp${uid})`} />
        <path d={`M20 ${LEVEL} Q40 ${LEVEL - 5} 60 ${LEVEL} T100 ${LEVEL} V${LEVEL + 4} H20Z`} fill="#f7c84a" />
        {!small && (
          <>
            <path d={`M20 ${LEVEL + 1} Q40 ${LEVEL - 4} 60 ${LEVEL + 1} T100 ${LEVEL + 1}`} stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" />
            <circle cx="60" cy="80" r="3" fill="#fff" opacity=".55" />
            <circle cx="63" cy="92" r="2" fill="#fff" opacity=".55" />
            <circle cx="57" cy="70" r="1.8" fill="#fff" opacity=".55" />
            <rect x="52" y={LEVEL} width="5" height={108 - LEVEL} rx="2.5" fill="#fff" opacity=".22" />
          </>
        )}
      </g>
      <path d={FLASK} fill="none" stroke={stroke} strokeWidth={small ? 9 : 6} strokeLinejoin="round" />
      {!small && (
        <g stroke="#d9861c" strokeWidth="2.2" strokeLinecap="round" fill="none" strokeDasharray="1 5" opacity=".7">
          <path d="M24 30 Q37 14 50 22" />
          <path d="M96 22 Q84 14 72 22" />
        </g>
      )}
      {orbs.map(([x, y, r, c, glow]) => (
        <g key={`${x}-${y}`}>
          {glow && <circle cx={x} cy={y} r={r * 2} fill={c} opacity=".22" />}
          <circle cx={x} cy={y} r={r} fill={c} />
          {!small && <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#fff" opacity=".85" />}
        </g>
      ))}
      {!small && <path d="M84 4 L85.2 6.8 L88 8 L85.2 9.2 L84 12 L82.8 9.2 L80 8 L82.8 6.8Z" fill="#f2b632" />}
    </svg>
  )
}

/** Logo com o nome, pro topo da tela inicial e do login. */
export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      <ArrowMark size={size * 1.15} />
      <span className="logo-word">streak</span>
    </span>
  )
}
