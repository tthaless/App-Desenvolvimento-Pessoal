import { useRef, useState } from 'react'
import type { Book } from '../lib/books'
import { MAX_PDF_MB, MAX_PDF_PAGES, removeAttachment, setAttachmentPublic, uploadAttachment } from '../lib/pdf'
import { errorMessage } from '../lib/utils'
import PdfViewer from './PdfViewer'

interface Props {
  book: Book
  viewerId: string
  onChanged: () => void
}

/** PDF de anotações do livro: o dono anexa, troca, apaga e escolhe quem vê; os outros só abrem. */
export default function PdfAttachment({ book, viewerId, onChanged }: Props) {
  const isOwner = book.user_id === viewerId
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choosing, setChoosing] = useState<File | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!isOwner && !book.attachment_path) return null

  return (
    <div className="pdf-attach" onClick={(e) => e.stopPropagation()}>
      {book.attachment_path ? (
        <div className="pdf-row">
          <button className="pdf-chip" onClick={() => setOpen(true)}>
            📄 Ver anotações
          </button>
          {isOwner && (
            <>
              <button
                className="pdf-privacy"
                disabled={busy}
                onClick={() => run(() => setAttachmentPublic(book.id, !book.attachment_public))}
                title="Mudar quem pode ver"
              >
                {book.attachment_public ? '👥 Grupo vê' : '🔒 Só eu'}
              </button>
              <button
                className="pdf-remove"
                disabled={busy}
                onClick={() => confirm('Apagar o PDF?') && run(() => removeAttachment(book.id, book.attachment_path!))}
                aria-label="Apagar PDF"
              >
                🗑
              </button>
            </>
          )}
        </div>
      ) : choosing ? (
        <div className="pdf-confirm">
          <p className="small">
            📄 <strong>{choosing.name}</strong>
          </p>
          <div className="segmented">
            <button type="button" className={isPublic ? 'on' : ''} onClick={() => setIsPublic(true)}>
              👥 Grupo vê
            </button>
            <button type="button" className={!isPublic ? 'on' : ''} onClick={() => setIsPublic(false)}>
              🔒 Só eu
            </button>
          </div>
          <p className="muted small">Só suas anotações, resumo ou resenha. Cópia do livro não.</p>
          <div className="row">
            <button className="btn ghost small-btn" onClick={() => setChoosing(null)} disabled={busy}>
              Cancelar
            </button>
            <button
              className="btn primary small-btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await uploadAttachment(viewerId, book.id, choosing, isPublic, book.attachment_path)
                  setChoosing(null)
                })
              }
            >
              {busy ? 'Enviando…' : 'Anexar'}
            </button>
          </div>
        </div>
      ) : (
        <button className="pdf-add" onClick={() => fileRef.current?.click()}>
          📎 Anexar PDF <span className="muted small">(até {MAX_PDF_MB} MB e {MAX_PDF_PAGES} páginas)</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            setIsPublic(true)
            setChoosing(f)
          }
          e.target.value = ''
        }}
      />
      {error && <p className="msg error">{error}</p>}
      {open && book.attachment_path && <PdfViewer path={book.attachment_path} title={book.title} onClose={() => setOpen(false)} />}
    </div>
  )
}
