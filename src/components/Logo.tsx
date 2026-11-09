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
const LEVEL = 52
/** Esferas de XP subindo ao lado da ponta, cada vez maiores: [x, y, raio]. */
const ORBS: [number, number, number][] = [
  [96, 36, 3.2],
  [102, 22, 4.6],
  [96, 7, 6],
]

/** Frasco em forma de seta enchendo de experiência (líquido dourado), com esferas de XP subindo. A marca do app. */
export function ArrowMark({ size = 24, className = '', stroke = 'var(--text)' }: { size?: number; className?: string; stroke?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg className={`arrow-mark ${className}`} width={size} height={size} viewBox="0 0 116 116" aria-hidden>
      <defs>
        <clipPath id={`fl${uid}`}>
          <path d={FLASK} />
        </clipPath>
      </defs>
      <rect x="20" y={LEVEL} width="80" height={120 - LEVEL} fill="#f2b632" clipPath={`url(#fl${uid})`} />
      <path d={FLASK} fill="none" stroke={stroke} strokeWidth={size < 40 ? 9 : 7} strokeLinejoin="round" />
      {ORBS.map(([x, y, r]) => (
        <circle key={y} cx={x} cy={y} r={r} fill="#f2b632" />
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
