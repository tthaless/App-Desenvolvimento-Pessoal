import { useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { enablePush, markPushOffered, shouldOfferPush } from '../lib/push'
import { errorMessage } from '../lib/utils'

/** Convite pra ligar as notificações, aparece uma vez depois da primeira prova. */
export default function PushOffer({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(() => shouldOfferPush())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!show || !visible) return null

  function close() {
    markPushOffered()
    setVisible(false)
  }

  async function accept() {
    setBusy(true)
    setError(null)
    try {
      await enablePush()
      markPushOffered()
      setDone(true)
      setTimeout(() => setVisible(false), 2200)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card push-offer" role="dialog" aria-label="Ligar notificações">
      <button className="push-offer-close" onClick={close} aria-label="Agora não">
        <X size={18} aria-hidden />
      </button>
      <BellRing size={22} className="push-offer-icon" aria-hidden />
      {done ? (
        <p className="push-offer-title">Pronto! Você vai ser avisado no celular.</p>
      ) : (
        <>
          <p className="push-offer-title">Quer ser avisado no celular?</p>
          <p className="muted small">Lembrete às 20h se faltar prova, e quando comentarem nas suas fotos. Dá pra mudar depois no Perfil.</p>
          {error && <p className="msg error">{error}</p>}
          <div className="row">
            <button className="btn ghost" onClick={close} disabled={busy}>
              Agora não
            </button>
            <button className="btn primary" onClick={accept} disabled={busy}>
              {busy ? 'Ativando…' : 'Ativar'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
