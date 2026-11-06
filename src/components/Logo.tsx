/** Foguinho do Streak (mesmo desenho do ícone do app). */
export function FlameMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`flame-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M33 4c2 10 15 16 15 32a16 16 0 0 1-32 0c0-8 4.5-12.5 7-16 1 5.5 3.5 8 5.5 9-1-10 1.5-17 4.5-25z" fill="var(--brand)" />
      <path d="M32 33c1.2 4.5 6.5 6.5 6.5 13a6.5 6.5 0 0 1-13 0c0-3.5 2-5.5 3.3-6.5 0 2.2 1 3.3 2.2 3.3-.2-4.3.2-6.8 1-9.8z" fill="var(--gold)" />
    </svg>
  )
}

/** Logo com o nome, pro topo da tela inicial e do login. */
export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      <FlameMark size={size * 1.05} />
      <span className="logo-word">streak</span>
    </span>
  )
}
