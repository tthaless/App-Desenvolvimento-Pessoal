import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import { ArrowMark } from './Logo'

export default function Auth() {
  const [mode, setMode] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const name = username.trim()
        if (name.length < 2 || name.length > 20) throw new Error('O nome precisa ter de 2 a 20 caracteres.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: name, invite_code: invite.trim() } },
        })
        if (error) throw error
        if (!data.session) setInfo('Conta criada! Confirme pelo link que enviamos no seu email e depois entre.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <ArrowMark size={68} className="auth-flame" />
        <h1>streak</h1>
        <p>Treinou? Leu? Prova com foto.<br />Quem não falta, ganha.</p>
      </div>

      <form className="card auth-form" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'entrar' ? 'on' : ''} onClick={() => setMode('entrar')}>
            Entrar
          </button>
          <button type="button" className={mode === 'cadastrar' ? 'on' : ''} onClick={() => setMode('cadastrar')}>
            Criar conta
          </button>
        </div>

        {mode === 'cadastrar' && (
          <label>
            Nome no grupo
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: thales" required maxLength={20} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>
        {mode === 'cadastrar' && (
          <label>
            Código de convite
            <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="peça pra quem te chamou" required />
          </label>
        )}

        {error && <p className="msg error">{error}</p>}
        {info && <p className="msg ok">{info}</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
