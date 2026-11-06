import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { abandonBook, daysBetween, fetchCurrentBook, finishBook, formatRating, startBook } from '../lib/books'
import type { Book } from '../lib/books'
import { refreshMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'

/** Livro em andamento no meu perfil: começar, terminar com nota ou largar. */
export default function CurrentBook({ userId, onShelfChanged }: { userId: string; onShelfChanged: () => void }) {
  const [book, setBook] = useState<Book | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setBook(await fetchCurrentBook(userId))
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function afterChange() {
    await load()
    await refreshMembers()
    onShelfChanged()
  }

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await startBook(title, author)
      setTitle('')
      setAuthor('')
      setStarting(false)
      await afterChange()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function abandon() {
    if (!book || !confirm(`Largar "${book.title}"? Ele não vai pra estante.`)) return
    try {
      await abandonBook(book.id)
      await afterChange()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (!loaded) return null

  return (
    <section className="card current-book act-leitura">
      <p className="muted small">📖 Lendo agora</p>
      {error && <p className="msg error">{error}</p>}

      {book ? (
        <>
          <p className="book-title">{book.title}</p>
          {book.author && <p className="muted small">{book.author}</p>}
          <p className="muted small book-meta">
            Há {daysBetween(book.started_at, new Date().toISOString())} {daysBetween(book.started_at, new Date().toISOString()) === 1 ? 'dia' : 'dias'} ·{' '}
            {book.proofs} {book.proofs === 1 ? 'prova de leitura' : 'provas de leitura'}
          </p>
          <div className="row book-actions">
            <button className="btn ghost" onClick={abandon}>
              Larguei
            </button>
            <button className="btn primary" onClick={() => setFinishing(true)}>
              ✓ Terminei
            </button>
          </div>
        </>
      ) : starting ? (
        <form className="book-form" onSubmit={start}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do livro" maxLength={120} required autoFocus />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor (opcional)" maxLength={80} />
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStarting(false)} disabled={busy}>
              Cancelar
            </button>
            <button className="btn primary" disabled={busy || !title.trim()}>
              {busy ? 'Salvando…' : 'Começar'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="muted">Nenhum livro em andamento.</p>
          <button className="btn primary full" onClick={() => setStarting(true)}>
            Começar um livro
          </button>
        </>
      )}

      {finishing && book && (
        <FinishSheet
          book={book}
          onClose={() => setFinishing(false)}
          onDone={async () => {
            setFinishing(false)
            await afterChange()
          }}
        />
      )}
    </section>
  )
}

function FinishSheet({ book, onClose, onDone }: { book: Book; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(8)
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await finishBook(book.id, rating, review)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={() => !busy && onClose()}>
      <div className="sheet finish-sheet act-leitura" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Terminar livro">
        <span className="sheet-grip" aria-hidden />
        <p className="muted small center">Terminou de ler</p>
        <p className="book-title center">{book.title}</p>

        <div className="rating-pick">
          <span className="rating-big">{formatRating(rating)}</span>
          <span className="muted">/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          aria-label="Nota de 1 a 10"
          className="rating-range"
        />
        <div className="rating-steps">
          <button type="button" onClick={() => setRating((r) => Math.max(1, Math.round((r - 0.1) * 10) / 10))} aria-label="Diminuir 0,1">
            −
          </button>
          <span className="muted small">Arraste ou ajuste de 0,1 em 0,1</span>
          <button type="button" onClick={() => setRating((r) => Math.min(10, Math.round((r + 0.1) * 10) / 10))} aria-label="Aumentar 0,1">
            +
          </button>
        </div>

        <label>
          O que achou? (opcional)
          <textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={500} rows={4} placeholder="Recomendaria? O que ficou de lição?" />
          <span className="counter">{review.length}/500</span>
        </label>
        <p className="muted small">Vai aparecer na sua estante e como post no feed.</p>
        {error && <p className="msg error">{error}</p>}
        <div className="row">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Salvando…' : 'Pôr na estante'}
          </button>
        </div>
      </div>
    </div>
  )
}
