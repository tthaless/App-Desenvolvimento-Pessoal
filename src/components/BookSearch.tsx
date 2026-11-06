import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { BookDraft } from '../lib/books'
import { searchBooks } from '../lib/openLibrary'
import BookCover from './BookCover'

interface Props {
  submitLabel: string
  busy?: boolean
  onSubmit: (draft: BookDraft) => void
  onCancel: () => void
}

/** Formulário de livro: digita o título, escolhe uma sugestão com capa ou segue só com o texto. */
export default function BookSearch({ submitLabel, busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [cover, setCover] = useState<string | null>(null)
  const [picked, setPicked] = useState(false)
  const [results, setResults] = useState<BookDraft[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = title.trim()
    if (picked || q.length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchBooks(q, ctrl.signal))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [title, picked])

  function pick(r: BookDraft) {
    setTitle(r.title)
    setAuthor(r.author)
    setCover(r.cover_url)
    setPicked(true)
    setResults([])
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), author: author.trim(), cover_url: cover })
  }

  return (
    <form className="book-form" onSubmit={submit}>
      <div className="book-form-top">
        <BookCover url={cover} title={title || '?'} size="md" />
        <div className="book-form-fields">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setPicked(false)
              setCover(null)
            }}
            placeholder="Título do livro"
            maxLength={120}
            required
            autoFocus
          />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor (opcional)" maxLength={80} />
        </div>
      </div>

      {searching && <p className="muted small">Procurando capa…</p>}
      {results.length > 0 && (
        <ul className="book-results" aria-label="Sugestões">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)}>
                <BookCover url={r.cover_url} title={r.title} size="sm" />
                <span className="book-result-text">
                  <span className="shelf-title">{r.title}</span>
                  {r.author && <span className="muted small">{r.author}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!picked && title.trim().length >= 3 && !searching && results.length === 0 && (
        <p className="muted small">Nenhuma capa encontrada. Dá pra salvar mesmo assim.</p>
      )}

      <div className="row">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button className="btn primary" disabled={busy || !title.trim()}>
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
