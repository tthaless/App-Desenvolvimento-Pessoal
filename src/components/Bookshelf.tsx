import { useState } from 'react'
import { daysBetween, formatRating } from '../lib/books'
import type { Book } from '../lib/books'
import { openProfile, useMembers } from '../lib/members'
import Avatar from './Avatar'
import BookCover from './BookCover'
import PdfAttachment from './PdfAttachment'
import { FileText, Heart } from 'lucide-react'

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

  if (books.length === 0) return <p className="muted small center empty">{emptyText}</p>

  return (
    <ul className="shelf-list">
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
          </li>
        )
      })}
    </ul>
  )
}
