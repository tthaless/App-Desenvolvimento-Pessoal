import { Moon, Sun } from 'lucide-react'
import { setTheme, toggleTheme, useTheme } from '../lib/theme'
import type { ThemeChoice } from '../lib/theme'

/** Botão pequeno do topo: troca entre claro e escuro. */
export default function ThemeButton() {
  const { dark } = useTheme()
  return (
    <button className="icon-btn topbar-btn theme-btn" onClick={toggleTheme} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}>
      {dark ? <Sun size={19} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}

const OPTIONS: { id: ThemeChoice; label: string }[] = [
  { id: 'claro', label: 'Claro' },
  { id: 'escuro', label: 'Escuro' },
  { id: 'auto', label: 'Automático' },
]

/** Escolha em Ajustes, com a opção de seguir o celular. */
export function ThemePicker() {
  const { choice } = useTheme()
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button key={o.id} role="radio" aria-checked={choice === o.id} className={choice === o.id ? 'on' : ''} onClick={() => setTheme(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
