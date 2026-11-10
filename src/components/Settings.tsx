import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ChevronRight, FileText, KeyRound, LogOut, Shield, Smartphone, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { changePassword, deleteAccount, signOut } from '../lib/account'
import { errorMessage } from '../lib/utils'
import LegalSheet from './LegalSheet'
import type { LegalDoc } from './LegalSheet'
import PasswordInput from './PasswordInput'
import PushSettings from './PushSettings'
import Sheet from './Sheet'
import { toast } from '../lib/toast'

type Panel = 'menu' | 'senha' | 'excluir'

/** Ajustes: notificações, conta, termos e excluir conta. */
export default function Settings({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [panel, setPanel] = useState<Panel>('menu')
  const [legal, setLegal] = useState<LegalDoc | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  const title = panel === 'senha' ? 'Trocar senha' : panel === 'excluir' ? 'Excluir conta' : 'Ajustes'

  return (
    <>
      <Sheet title={title} onClose={onClose} className="settings">
        {panel === 'menu' && (
          <>
            <PushSettings />

            <SettingsGroup label="Conta">
              {email && (
                <div className="settings-row static">
                  <span className="settings-row-text">
                    <span>E-mail</span>
                    <span className="muted small">{email}</span>
                  </span>
                </div>
              )}
              <Row icon={<KeyRound size={18} />} label="Trocar senha" onClick={() => setPanel('senha')} />
              <Row icon={<LogOut size={18} />} label="Sair da conta" onClick={() => signOut()} chevron={false} />
            </SettingsGroup>

            <SettingsGroup label="Sobre">
              <Row icon={<FileText size={18} />} label="Termos de uso" onClick={() => setLegal('termos')} />
              <Row icon={<Shield size={18} />} label="Política de privacidade" onClick={() => setLegal('privacidade')} />
              <div className="settings-row static">
                <span className="settings-icon" aria-hidden>
                  <Smartphone size={18} />
                </span>
                <span className="settings-row-text">
                  <span>Versão</span>
                  <span className="muted small">{__APP_VERSION__}</span>
                </span>
              </div>
            </SettingsGroup>

            <SettingsGroup>
              <Row icon={<Trash2 size={18} />} label="Excluir conta" danger onClick={() => setPanel('excluir')} />
            </SettingsGroup>
          </>
        )}
        {panel === 'senha' && <ChangePassword onDone={() => setPanel('menu')} />}
        {panel === 'excluir' && <DeleteAccount userId={userId} onCancel={() => setPanel('menu')} />}
      </Sheet>
      {legal && <LegalSheet doc={legal} onClose={() => setLegal(null)} />}
    </>
  )
}

function SettingsGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      {label && <h3 className="settings-label">{label}</h3>}
      <div className="settings-list">{children}</div>
    </section>
  )
}

function Row({
  icon,
  label,
  onClick,
  danger,
  chevron = true,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  chevron?: boolean
}) {
  return (
    <button className={`settings-row ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span className="settings-icon" aria-hidden>
        {icon}
      </span>
      <span className="settings-row-text">{label}</span>
      {chevron && <ChevronRight size={18} className="settings-chevron" aria-hidden />}
    </button>
  )
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('As duas senhas não são iguais.')
    setBusy(true)
    setError(null)
    try {
      await changePassword(password)
      setOk(true)
      toast('Senha trocada')
      setTimeout(onDone, 1400)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
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
      {ok && (
        <p className="msg ok" role="status">
          Senha trocada.
        </p>
      )}
      <div className="row">
        <button type="button" className="btn ghost" onClick={onDone} disabled={busy}>
          Voltar
        </button>
        <button className="btn primary" disabled={busy || ok}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

const CONFIRM_WORD = 'EXCLUIR'

function DeleteAccount({ userId, onCancel }: { userId: string; onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(userId)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="settings-form">
      <p>Isso apaga de vez a sua conta e tudo o que está nela:</p>
      <ul className="danger-list">
        <li>perfil, foto e plano de fundo</li>
        <li>provas, sequências e pontos no ranking</li>
        <li>livros, notas, resenhas e PDFs</li>
        <li>posts, comentários, curtidas e votos</li>
      </ul>
      <p className="muted small">Não dá pra desfazer. Se quiser voltar depois, vai precisar de um convite e começar do zero.</p>
      <label>
        Digite {CONFIRM_WORD} para confirmar
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
      </label>
      {error && (
        <p className="msg error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="btn ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button className="btn danger" onClick={run} disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}>
          {busy ? 'Excluindo…' : 'Excluir conta'}
        </button>
      </div>
    </div>
  )
}
