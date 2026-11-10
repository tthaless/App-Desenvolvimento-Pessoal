import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { answer, useConfirm } from '../lib/confirm'

/** Janela de confirmação do app, usada no lugar do aviso padrão do navegador. */
export default function ConfirmDialog() {
  const pending = useConfirm()

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && answer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending])

  if (!pending) return null
  return createPortal(
    <div className="confirm-backdrop" onClick={() => answer(false)}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-label={pending.title} onClick={(e) => e.stopPropagation()}>
        <p className="confirm-title">{pending.title}</p>
        {pending.text && <p className="muted small">{pending.text}</p>}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={() => answer(false)}>
            Cancelar
          </button>
          <button className="btn danger" onClick={() => answer(true)} autoFocus>
            {pending.action}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
