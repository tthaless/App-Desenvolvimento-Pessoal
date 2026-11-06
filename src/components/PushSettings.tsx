import { useEffect, useState } from 'react'
import { BellRing, Smartphone } from 'lucide-react'
import { DEFAULT_PREFS, disablePush, enablePush, isSubscribed, loadPrefs, pushSupport, savePrefs } from '../lib/push'
import type { PushPrefs } from '../lib/push'
import { errorMessage } from '../lib/utils'

const OPTIONS: { key: keyof PushPrefs; label: string; hint: string }[] = [
  { key: 'reminder', label: 'Lembrete das 20h', hint: 'Se ainda faltar alguma prova do dia' },
  { key: 'last_one', label: 'Só falta você', hint: 'Quando o resto do grupo já postou' },
  { key: 'comments', label: 'Comentários', hint: 'Nas suas provas, posts e respostas' },
  { key: 'social', label: 'Curtidas, votos e listas', hint: 'Livros, ideias de desafio e "quero ler também"' },
]

/** Ligar/desligar as notificações no celular e escolher o que receber. */
export default function PushSettings() {
  const support = pushSupport()
  const [on, setOn] = useState<boolean | null>(null)
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isSubscribed().then(setOn).catch(() => setOn(false))
    loadPrefs().then(setPrefs).catch(() => {})
  }, [])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      if (on) await disablePush()
      else await enablePush()
      setOn(!on)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function change(key: keyof PushPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      await savePrefs(next)
    } catch (e) {
      setPrefs(prefs)
      setError(errorMessage(e))
    }
  }

  return (
    <section className="card push-settings">
      <div className="push-head">
        <span className="info-icon push-icon" aria-hidden>
          <BellRing size={18} />
        </span>
        <div className="push-text">
          <p className="push-title">Notificações no celular</p>
          <p className="muted small">
            {support === 'ok' && (on ? 'Ligadas neste aparelho' : 'Avisos mesmo com o app fechado')}
            {support === 'ios-install' && 'No iPhone, instale o Streak na tela inicial primeiro'}
            {support === 'unsupported' && 'Este navegador não recebe notificações'}
          </p>
        </div>
        {support === 'ok' && on !== null && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Notificações no celular"
            className={`switch ${on ? 'on' : ''}`}
            disabled={busy}
            onClick={toggle}
          >
            <span />
          </button>
        )}
      </div>

      {support === 'ios-install' && (
        <p className="muted small push-help">
          <Smartphone size={14} aria-hidden /> Abra no Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. Depois abra pelo ícone e
          ligue aqui. Precisa do iOS 16.4 ou mais novo.
        </p>
      )}

      {error && <p className="msg error">{error}</p>}

      {on && (
        <ul className="push-options">
          {OPTIONS.map((o) => (
            <li key={o.key}>
              <label>
                <span>
                  <span className="push-opt-label">{o.label}</span>
                  <span className="muted small">{o.hint}</span>
                </span>
                <input type="checkbox" checked={prefs[o.key]} onChange={() => change(o.key)} />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
