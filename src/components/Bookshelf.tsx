import { useEffect, useState } from 'react'
import { daysBetween, fetchShelf, formatRating } from '../lib/books'
import type { Book } from '../lib/books'

/** Livros terminados no app, do mais recente pro mais antigo. */
export default function Bookshelf({ userId, refreshKey }: { userId: string; refreshKey?: number }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchShelf(userId)
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setLoaded(true))
  }, [userId, refreshKey])

  if (!loaded) return null

  const avg = books.length ? books.reduce((s, b) => s + (b.rating ?? 0), 0) / books.length : 0

  return (
    <section className="card shelf act-leitura">
      <div className="shelf-head">
        <h2>📚 Estante</h2>
        {books.length > 0 && (
          <span className="muted small">
            {books.length} {books.length === 1 ? 'livro' : 'livros'} · média {formatRating(Math.round(avg * 10) / 10)}
          </span>
        )}
      </div>
      {books.length === 0 && <p className="muted small">Nenhum livro terminado ainda.</p>}
      <ul className="shelf-list">
        {books.map((b) => {
          const expanded = open === b.id
          const days = daysBetween(b.started_at, b.finished_at!)
          return (
            <li key={b.id}>
              <button className="shelf-item" onClick={() => setOpen(expanded ? null : b.id)} aria-expanded={expanded}>
                <span className="spine" aria-hidden />
                <span className="shelf-info">
                  <span className="shelf-title">{b.title}</span>
                  {b.author && <span className="muted small">{b.author}</span>}
                  <span className="muted small">
                    {new Date(b.finished_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · em {days} {days === 1 ? 'dia' : 'dias'}
                  </span>
                </span>
                <span className="rating-badge">{formatRating(b.rating ?? 0)}</span>
              </button>
              {b.review && <p className={`shelf-review ${expanded ? 'open' : ''}`}>“{b.review}”</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
