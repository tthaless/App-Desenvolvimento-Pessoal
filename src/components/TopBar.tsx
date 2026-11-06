import type { ReactNode } from 'react'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

/** Barra de topo fixa: logo na tela inicial, título curto nas outras, e o sininho de avisos. */
export default function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      {title ? <h1 className="topbar-title">{title}</h1> : <Logo />}
      <div className="topbar-right">
        {right}
        <NotificationBell />
      </div>
    </header>
  )
}
