import type { ReactNode } from 'react'
import Logo from './Logo'

/** Barra de topo fixa: logo na tela inicial, título curto nas outras. */
export default function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      {title ? <h1 className="topbar-title">{title}</h1> : <Logo />}
      {right && <div className="topbar-right">{right}</div>}
    </header>
  )
}
