import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import { ArrowMark } from './Logo'
import InstallGuide from './InstallGuide'
import LegalSheet from './LegalSheet'
import type { LegalDoc } from './LegalSheet'
import PasswordInput from './PasswordInput'

type Mode = 'entrar' | 'cadastrar' | 'recuperar'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [legal, setLegal] = useState<LegalDoc | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin })
        if (error) throw error
        setInfo('Se esse e-mail tiver conta, chega em instantes um link pra criar uma senha nova. Olhe também o spam.')
      } else {
        const name = username.trim()
        if (name.length < 2 || name.length > 20) throw new Error('O nome precisa ter de 2 a 20 caracteres.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: name, invite_code: invite.trim() } },
        })
        if (error) throw error
        if (!data.session) setInfo('Conta criada! Confirme pelo link que enviamos no seu e-mail e depois entre.')
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
        <p>
          Treinou? Leu? Prova com foto.
          <br />
          Quem não falta, ganha.
        </p>
      </div>

      <form className="card auth-form" onSubmit={submit}>
        {mode === 'recuperar' ? (
          <div className="auth-recover-head">
            <button type="button" className="icon-btn" onClick={() => switchMode('entrar')} aria-label="Voltar para entrar">
              <ArrowLeft size={20} aria-hidden />
            </button>
            <div>
              <h2>Esqueci minha senha</h2>
              <p className="muted small">Mandamos um link pro seu e-mail pra você criar uma senha nova.</p>
            </div>
          </div>
        ) : (
          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'entrar'} className={mode === 'entrar' ? 'on' : ''} onClick={() => switchMode('entrar')}>
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'cadastrar'}
              className={mode === 'cadastrar' ? 'on' : ''}
              onClick={() => switchMode('cadastrar')}
            >
              Criar conta
            </button>
          </div>
        )}

        {mode === 'cadastrar' && (
          <label>
            Nome no grupo
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: thales" required maxLength={20} autoComplete="nickname" />
          </label>
        )}
        <label>
          E-mail
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {mode !== 'recuperar' && (
          <label>
            Senha
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            />
          </label>
        )}
        {mode === 'cadastrar' && (
          <label>
            Código de convite
            <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="peça pra quem te chamou" required autoCapitalize="off" />
          </label>
        )}

        {error && (
          <p className="msg error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="msg ok" role="status">
            {info}
          </p>
        )}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : mode === 'cadastrar' ? 'Criar conta' : 'Enviar link'}
        </button>

        {mode === 'entrar' && (
          <button type="button" className="link-btn" onClick={() => switchMode('recuperar')}>
            Esqueci minha senha
          </button>
        )}
        {mode === 'cadastrar' && (
          <p className="auth-legal">
            Ao criar a conta, você concorda com os{' '}
            <button type="button" className="link-btn inline" onClick={() => setLegal('termos')}>
              Termos de uso
            </button>{' '}
            e a{' '}
            <button type="button" className="link-btn inline" onClick={() => setLegal('privacidade')}>
              Política de privacidade
            </button>
            .
          </p>
        )}
      </form>

      <InstallGuide />

      <footer className="auth-footer">
        <button type="button" className="link-btn" onClick={() => setLegal('termos')}>
          Termos
        </button>
        <span aria-hidden>·</span>
        <button type="button" className="link-btn" onClick={() => setLegal('privacidade')}>
          Privacidade
        </button>
      </footer>

      {legal && <LegalSheet doc={legal} onClose={() => setLegal(null)} />}
    </div>
  )
}
