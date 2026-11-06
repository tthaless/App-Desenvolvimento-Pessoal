/** Foguinho da sequência de dias. */
export function FlameMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`flame-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M33 4c2 10 15 16 15 32a16 16 0 0 1-32 0c0-8 4.5-12.5 7-16 1 5.5 3.5 8 5.5 9-1-10 1.5-17 4.5-25z" fill="var(--brand)" />
      <path d="M32 33c1.2 4.5 6.5 6.5 6.5 13a6.5 6.5 0 0 1-13 0c0-3.5 2-5.5 3.3-6.5 0 2.2 1 3.3 2.2 3.3-.2-4.3.2-6.8 1-9.8z" fill="var(--gold)" />
    </svg>
  )
}

/** Esferas de XP em volta da ponta da seta: [x, y, raio, cor]. */
const ORBS_FULL: [number, number, number, string][] = [
  [26, 34, 6, '#ff9b3d'],
  [40, 16, 3.5, 'var(--gold)'],
  [84, 14, 4.5, '#ff9b3d'],
  [98, 34, 6.5, 'var(--gold)'],
  [102, 52, 3, '#ff9b3d'],
]
const ORBS_SMALL: [number, number, number, string][] = [
  [25, 32, 8, '#ff9b3d'],
  [97, 30, 9, 'var(--gold)'],
]

/** Frasco em forma de seta para cima com esferas de XP, a marca do app. */
export function ArrowMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  // Em tamanhos pequenos, menos esferas (maiores) e contorno mais grosso.
  const small = size < 40
  const orbs = small ? ORBS_SMALL : ORBS_FULL
  return (
    <svg className={`arrow-mark ${className}`} width={size} height={size} viewBox="8 2 104 110" aria-hidden>
      <path
        d="M38 52 Q49 46 60 52 T82 52 L87 59 Q89 62 85 62 H66 V102 Q66 105 63 105 H57 Q54 105 54 102 V62 H35 Q31 62 33 59 Z"
        fill="var(--brand)"
      />
      {!small && (
        <>
          <circle cx="60" cy="92" r="2.6" fill="var(--gold)" />
          <circle cx="58" cy="78" r="2" fill="var(--gold)" />
          <circle cx="66" cy="57" r="2" fill="var(--gold)" />
        </>
      )}
      <path
        d="M60 12 L91 60 Q94 66 87 66 H70 V104 Q70 110 64 110 H56 Q50 110 50 104 V66 H33 Q26 66 29 60 Z"
        fill="none"
        stroke="var(--text)"
        strokeWidth={small ? 9 : 5}
        strokeLinejoin="round"
      />
      {orbs.map(([x, y, r, c]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r} fill={c} />
          {!small && <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#fff4d6" />}
        </g>
      ))}
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
