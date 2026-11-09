import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDragToClose } from '../lib/useDragToClose'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
  /** Ação no canto, ao lado do X. */
  action?: ReactNode
}

/** Janela que sobe de baixo, com título, botão de fechar, Esc e arrastar pra baixo. */
export default function Sheet({ title, onClose, children, className = '', action }: Props) {
  const sheetRef = useDragToClose<HTMLDivElement>(onClose)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  // Foco vai pra janela ao abrir e volta pra onde estava ao fechar (leitor de tela e teclado).
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    sheetRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      previous?.focus?.({ preventScroll: true })
    }
  }, [sheetRef])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className={`sheet sheet-page ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-grip" aria-hidden />
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <div className="sheet-head-actions">
            {action}
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
