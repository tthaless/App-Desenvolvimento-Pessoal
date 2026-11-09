import { useState } from 'react'
import type { FormEvent } from 'react'
import { changePassword } from '../lib/account'
import { errorMessage } from '../lib/utils'
import { ArrowMark } from './Logo'
import PasswordInput from './PasswordInput'

/** Tela aberta pelo link de "esqueci minha senha": cria a senha nova. */
export default function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('As duas senhas não são iguais.')
    setBusy(true)
    setError(null)
    try {
      await changePassword(password)
      history.replaceState(null, '', '/')
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <ArrowMark size={56} className="auth-flame" />
        <h1>Senha nova</h1>
        <p>Escolha uma senha com pelo menos 6 caracteres.</p>
      </div>
      <form className="card auth-form" onSubmit={submit}>
        <label>
          Nova senha
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </label>
        <label>
          Repita a senha
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </label>
        {error && (
          <p className="msg error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar e entrar'}
        </button>
      </form>
    </div>
  )
}
