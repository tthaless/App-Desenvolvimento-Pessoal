import { useEffect, useRef, useState } from 'react'
import { daysBetween, deleteBook, formatRating, saveShelfOrder } from '../lib/books'
import { errorMessage } from '../lib/utils'
import type { Book } from '../lib/books'
import { openProfile, useMembers } from '../lib/members'
import Avatar from './Avatar'
import BookCover from './BookCover'
import PdfAttachment from './PdfAttachment'
import { Check, FileText, GripVertical, Heart, Pencil, Trash2 } from 'lucide-react'

interface Props {
  books: Book[]
  viewerId: string
  onChanged: () => void
  /** Mostra quem leu (na biblioteca do grupo). */
  showReader?: boolean
  /** Na minha estante: botão "Editar estante" (ordem e exclusão). */
  editable?: boolean
  emptyText?: string
}

/** Livros terminados: capa, nota, comentário, curtidas e PDF de anotações. */
export default function Bookshelf({ books, viewerId, onChanged, showReader, editable, emptyText = 'Nenhum livro terminado ainda.' }: Props) {
  const members = useMembers()
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<Book[]>(books)
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!editing) setOrder(books)
  }, [books, editing])

  // Arrastar pela alça: o livro troca de lugar quando o dedo passa do meio do vizinho.
  function onDragStart(e: React.PointerEvent, id: string) {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragId(id)
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragId || !listRef.current) return
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('[data-book]')]
    const from = order.findIndex((b) => b.id === dragId)
    let to = from
    rows.forEach((row, i) => {
      const r = row.getBoundingClientRect()
      const mid = r.top + r.height / 2
      if (i < from && e.clientY < mid) to = Math.min(to, i)
      if (i > from && e.clientY > mid) to = Math.max(to, i)
    })
    if (to !== from) {
      const next = [...order]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      setOrder(next)
    }
  }
  function onDragEnd() {
    setDragId(null)
  }

  async function finishEditing() {
    setError(null)
    const changed = order.some((b, i) => b.id !== books[i]?.id)
    if (changed) {
      setSaving(true)
      try {
        await saveShelfOrder(order.map((b) => b.id))
        onChanged()
      } catch (e) {
        setError(errorMessage(e))
        setSaving(false)
        return
      }
      setSaving(false)
    }
    setConfirming(null)
    setEditing(false)
  }

  async function remove(b: Book) {
    setDeleting(true)
    setError(null)
    try {
      await deleteBook(b)
      setConfirming(null)
      setOpen(null)
      setOrder((prev) => prev.filter((x) => x.id !== b.id))
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  if (books.length === 0) return <p className="muted small center empty">{emptyText}</p>

  const toolbar = editable && books.length > 0 && (
    <div className="shelf-tools">
      {editing ? (
        <>
          <span className="muted small">{books.length > 1 ? 'Arraste pela alça pra mudar a ordem' : 'Toque na lixeira pra tirar da estante'}</span>
          <button className="shelf-tool-btn on" onClick={finishEditing} disabled={saving}>
            <Check size={15} aria-hidden /> {saving ? 'Salvando…' : 'Concluir'}
          </button>
        </>
      ) : (
        <button className="shelf-tool-btn" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden /> Editar estante
        </button>
      )}
    </div>
  )

  if (editing)
    return (
      <>
        {toolbar}
        {error && <p className="msg error">{error}</p>}
        <ul className="shelf-edit-list" ref={listRef} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          {order.map((b) => (
            <li key={b.id} data-book className={dragId === b.id ? 'dragging' : ''}>
              <div className="shelf-edit-row">
                <button
                  className="drag-handle"
                  onPointerDown={(e) => onDragStart(e, b.id)}
                  aria-label={`Arrastar ${b.title}`}
                  disabled={order.length < 2}
                >
                  <GripVertical size={18} aria-hidden />
                </button>
                <BookCover url={b.cover_url} title={b.title} size="sm" />
                <span className="shelf-edit-title">{b.title}</span>
                <button className="icon-btn shelf-trash" onClick={() => setConfirming(confirming === b.id ? null : b.id)} aria-label={`Excluir ${b.title}`}>
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
              {confirming === b.id && (
                <div className="shelf-delete">
                  <p className="small">
                    Excluir <strong>{b.title}</strong> da estante? Somem também a nota, o post no feed, as curtidas e o PDF. Suas provas de leitura
                    continuam valendo.
                  </p>
                  <div className="row">
                    <button className="btn ghost" onClick={() => setConfirming(null)} disabled={deleting}>
                      Cancelar
                    </button>
                    <button className="btn danger" onClick={() => remove(b)} disabled={deleting}>
                      <Trash2 size={16} aria-hidden /> {deleting ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </>
    )

  return (
    <>
    {toolbar}
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
          </li>
        )
      })}
      </ul>
      <div className="bookcase-base" aria-hidden />
    </div>
    </>
  )
}
