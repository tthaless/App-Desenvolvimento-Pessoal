import { useState } from 'react'
import { daysBetween, deleteBook, formatRating } from '../lib/books'
import { errorMessage } from '../lib/utils'
import type { Book } from '../lib/books'
import { openProfile, useMembers } from '../lib/members'
import Avatar from './Avatar'
import BookCover from './BookCover'
import PdfAttachment from './PdfAttachment'
import { FileText, Heart, Trash2 } from 'lucide-react'

interface Props {
  books: Book[]
  viewerId: string
  onChanged: () => void
  /** Mostra quem leu (na biblioteca do grupo). */
  showReader?: boolean
  emptyText?: string
}

/** Livros terminados: capa, nota, comentário, curtidas e PDF de anotações. */
export default function Bookshelf({ books, viewerId, onChanged, showReader, emptyText = 'Nenhum livro terminado ainda.' }: Props) {
  const members = useMembers()
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(b: Book) {
    setDeleting(true)
    setError(null)
    try {
      await deleteBook(b)
      setConfirming(null)
      setOpen(null)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  if (books.length === 0) return <p className="muted small center empty">{emptyText}</p>

  return (
    <div className="bookcase">
      <div className="bookcase-top" aria-hidden>
        <span className="cornice" />
        <span className="frieze">
          <span className="frieze-block" />
          <span className="frieze-panel" />
          <span className="frieze-block" />
        </span>
      </div>
      <ul className="shelf-list bookcase-shelves">
      {books.map((b) => {
        const expanded = open === b.id
        const days = daysBetween(b.started_at, b.finished_at!)
        const reader = members.find((m) => m.id === b.user_id)
        return (
          <li key={b.id} className="shelf-book">
            <button className="shelf-item" onClick={() => setOpen(expanded ? null : b.id)} aria-expanded={expanded}>
              <BookCover url={b.cover_url} title={b.title} size="md" />
              <span className="shelf-info">
                <span className="shelf-title">{b.title}</span>
                {b.author && <span className="muted small">{b.author}</span>}
                <span className="muted small">
                  {new Date(b.finished_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · em {days}{' '}
                  {days === 1 ? 'dia' : 'dias'}
                </span>
                <span className="shelf-badges">
                  {b.likes > 0 && (
                    <span className="like-count">
                      <Heart size={13} fill="currentColor" aria-hidden /> {b.likes}
                    </span>
                  )}
                  {b.attachment_path && (
                    <span className="muted small icon-text">
                      <FileText size={13} aria-hidden /> PDF
                    </span>
                  )}
                </span>
              </span>
              <span className="rating-badge">{formatRating(b.rating ?? 0)}</span>
            </button>
            {showReader && reader && (
              <button className="by shelf-reader" onClick={() => openProfile(b.user_id)}>
                <Avatar name={reader.username} url={reader.avatar_url} size="sm" />
                <span className="muted small">lido por</span> <strong className="small">{reader.username}</strong>
              </button>
            )}
            {b.review && <p className={`shelf-review ${expanded ? 'open' : ''}`}>“{b.review}”</p>}
            {(expanded || b.user_id !== viewerId) && <PdfAttachment book={b} viewerId={viewerId} onChanged={onChanged} />}
            {expanded && b.user_id === viewerId && (
              <div className="shelf-delete">
                {confirming === b.id ? (
                  <>
                    <p className="small">
                      Excluir <strong>{b.title}</strong> da estante? Somem também a nota, o post no feed, as curtidas e o PDF. Suas provas de
                      leitura continuam valendo.
                    </p>
                    {error && <p className="msg error">{error}</p>}
                    <div className="row">
                      <button className="btn ghost" onClick={() => setConfirming(null)} disabled={deleting}>
                        Cancelar
                      </button>
                      <button className="btn danger" onClick={() => remove(b)} disabled={deleting}>
                        <Trash2 size={16} aria-hidden /> {deleting ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button className="shelf-delete-btn" onClick={() => setConfirming(b.id)}>
                    <Trash2 size={14} aria-hidden /> Excluir da estante
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
      </ul>
      <div className="bookcase-base" aria-hidden />
    </div>
  )
}
