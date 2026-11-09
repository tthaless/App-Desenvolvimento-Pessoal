import type { ReactNode } from 'react'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

interface Props {
  title?: string
  /** Linha pequena acima do título (ex.: a data no Início). */
  subtitle?: string
  right?: ReactNode
}

/** Barra de topo fixa: título da aba (ou o logo), e o sininho de avisos. */
export default function TopBar({ title, subtitle, right }: Props) {
  return (
    <header className={`topbar ${subtitle ? 'with-sub' : ''}`}>
      {title ? (
        <div className="topbar-text">
          {subtitle && <p className="topbar-sub">{subtitle}</p>}
          <h1 className="topbar-title">{title}</h1>
        </div>
      ) : (
        <Logo />
      )}
      <div className="topbar-right">
        {right}
        <NotificationBell />
      </div>
    </header>
  )
}
