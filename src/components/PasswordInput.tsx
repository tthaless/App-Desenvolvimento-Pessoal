import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
}

/** Campo de senha com botão de mostrar/esconder. */
export default function PasswordInput({ value, onChange, autoComplete, placeholder }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={6}
        required
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={(e) => {
          e.preventDefault()
          setVisible((v) => !v)
        }}
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </span>
  )
}
