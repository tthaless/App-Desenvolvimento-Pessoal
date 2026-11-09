import { useEffect, useState } from 'react'
import { BookmarkPlus, Heart, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { addWant, daysBetween, formatRating, ratingTier, setBookLike } from '../lib/books'
import type { Book } from '../lib/books'
import { openProfile, useMembers } from '../lib/members'
import { toast } from '../lib/toast'
import { errorMessage } from '../lib/utils'
import Avatar from './Avatar'
import BookCover from './BookCover'
import PdfAttachment from './PdfAttachment'
import Sheet from './Sheet'

/** Detalhes de um livro da estante: nota, resumo de quem leu, PDF de anotações e curtida. */
export default function BookSheet({ book, viewerId, onClose, onChanged }: { book: Book; viewerId: string; onClose: () => void; onChanged: () => void }) {
  const reader = useMembers().find((m) => m.id === book.user_id)
  const mine = book.user_id === viewerId
  const [liked, setLiked] = useState<boolean | null>(null)
  const [likes, setLikes] = useState(book.likes)
  const [busy, setBusy] = useState(false)
  const days = daysBetween(book.started_at, book.finished_at!)
  const finished = new Date(book.finished_at!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

  useEffect(() => {
    if (mine) return
    supabase
      .from('book_likes')
      .select('user_id')
      .eq('book_id', book.id)
      .eq('user_id', viewerId)
      .then(({ data }) => setLiked(!!data?.length))
  }, [book.id, viewerId, mine])

  async function toggleLike() {
    if (liked === null) return
    const next = !liked
    setLiked(next)
    setLikes((n) => n + (next ? 1 : -1))
    try {
      await setBookLike(book.id, viewerId, next)
      onChanged()
    } catch (e) {
      setLiked(!next)
      setLikes((n) => n + (next ? -1 : 1))
      toast(errorMessage(e), 'error')
    }
  }

  async function wantToo() {
    setBusy(true)
    try {
      await addWant({ title: book.title, author: book.author ?? '', cover_url: book.cover_url }, book.user_id)
      toast('Adicionado ao seu Quero ler')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Livro" onClose={onClose} className="book-sheet">
      <div className="book-sheet-top">
        <BookCover url={book.cover_url} title={book.title} author={book.author} size="xl" />
        <div className="book-sheet-info">
          <h3>{book.title}</h3>
          {book.author && <p className="muted">{book.author}</p>}
          <span className={`book-rating tier-${ratingTier(book.rating ?? 0)}`}>
            <Star size={14} fill="currentColor" aria-hidden /> {formatRating(book.rating ?? 0)}
          </span>
          <p className="muted small">
            Terminou em {finished}
            <br />
            Leu em {days} {days === 1 ? 'dia' : 'dias'}
            {book.total_pages ? ` · ${book.total_pages} páginas` : ''}
          </p>
        </div>
      </div>

      {!mine && reader && (
        <button className="book-sheet-reader" onClick={() => openProfile(book.user_id)}>
          <Avatar name={reader.username} url={reader.avatar_url} size="sm" />
          <span>
            Lido por <strong>{reader.username}</strong>
          </span>
        </button>
      )}

      <section className="book-sheet-section">
        <h4>{mine ? 'Seu resumo' : `O que ${reader?.username ?? 'a pessoa'} achou`}</h4>
        {book.review ? <p className="book-sheet-review">{book.review}</p> : <p className="muted small">{mine ? 'Você não escreveu resumo desse livro.' : 'Sem resumo desse livro.'}</p>}
      </section>

      <section className="book-sheet-section">
        <h4>Anotações</h4>
        {book.attachment_path || mine ? (
          <PdfAttachment book={book} viewerId={viewerId} onChanged={onChanged} />
        ) : (
          <p className="muted small">Sem PDF de anotações.</p>
        )}
      </section>

      <div className="book-sheet-actions">
        {mine ? (
          <span className="book-sheet-likes">
            <Heart size={16} fill={likes ? 'currentColor' : 'none'} aria-hidden /> {likes} {likes === 1 ? 'curtida' : 'curtidas'}
          </span>
        ) : (
          <>
            <button className={`btn ghost ${liked ? 'liked' : ''}`} onClick={toggleLike} disabled={liked === null} aria-pressed={!!liked}>
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} aria-hidden /> {likes > 0 ? likes : 'Curtir'}
            </button>
            <button className="btn ghost" onClick={wantToo} disabled={busy}>
              <BookmarkPlus size={17} aria-hidden /> Quero ler também
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
