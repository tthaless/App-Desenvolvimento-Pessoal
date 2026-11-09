import { useCallback, useEffect, useState } from 'react'
import { BOOK_BONUS, SUMMARY_MIN, abandonBook, daysBetween, fetchCurrentBook, finishBook, formatRating, setBookPages, startBook } from '../lib/books'
import type { Book, BookDraft } from '../lib/books'
import { refreshMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import CoverPicker from './CoverPicker'
import BookSearch from './BookSearch'
import PdfAttachment from './PdfAttachment'
import { BookOpen, Check, FileText, PenLine, Sparkles } from 'lucide-react'
import EmptyState from './EmptyState'
import { toast } from '../lib/toast'
import { ReadingProgress } from './ReadingProgress'
import { useDragToClose } from '../lib/useDragToClose'
import { SkeletonCard } from './Skeleton'

interface Props {
  userId: string
  /** Muda quando um livro começa por fora (pela lista Quero ler). */
  refreshKey?: number
  onShelfChanged: () => void
  onLoaded?: (book: Book | null) => void
}

/** Livro em andamento na minha biblioteca: começar, terminar com nota, largar e anexar PDF. */
export default function CurrentBook({ userId, refreshKey, onShelfChanged, onLoaded }: Props) {
  const [book, setBook] = useState<Book | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const b = await fetchCurrentBook(userId)
      setBook(b)
      onLoaded?.(b)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [userId, onLoaded])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function afterChange() {
    await load()
    await refreshMembers()
    onShelfChanged()
  }

  async function start(draft: BookDraft) {
    setBusy(true)
    setError(null)
    try {
      await startBook(draft)
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

  if (!loaded) return <SkeletonCard height={200} />

  return (
    <section className="card current-book act-leitura">
      <p className="section-label">Lendo agora</p>
      {error && <p className="msg error">{error}</p>}

      {book ? (
        <>
          <div className="current-top">
            <CoverPicker table="books" id={book.id} userId={userId} url={book.cover_url} title={book.title} size="lg" onChanged={load} />
            <div className="current-info">
              <p className="book-title">{book.title}</p>
              {book.author && <p className="muted small">{book.author}</p>}
              <p className="muted small book-meta">
                Há {daysBetween(book.started_at, new Date().toISOString())}{' '}
                {daysBetween(book.started_at, new Date().toISOString()) === 1 ? 'dia' : 'dias'} · {book.proofs}{' '}
                {book.proofs === 1 ? 'prova de leitura' : 'provas de leitura'}
              </p>
            </div>
          </div>
          <PagesEditor book={book} onSaved={afterChange} />
          <PdfAttachment book={book} viewerId={userId} onChanged={load} />
          <div className="row book-actions">
            <button className="btn ghost" onClick={abandon}>
              Larguei
            </button>
            <button className="btn primary" onClick={() => setFinishing(true)}>
              <Check size={18} strokeWidth={3} aria-hidden /> Terminei
            </button>
          </div>
        </>
      ) : starting ? (
        <BookSearch askPages submitLabel="Começar" busy={busy} onSubmit={start} onCancel={() => setStarting(false)} />
      ) : (
        <>
          <EmptyState
            bare
            tone="reading"
            icon={<BookOpen size={28} />}
            title="Nenhum livro em andamento"
            text={`Comece um livro pra acompanhar páginas e porcentagem. Terminando com resumo ou PDF, vale +${BOOK_BONUS} pontos.`}
            action={
              <button className="btn primary full" onClick={() => setStarting(true)}>
                Começar um livro
              </button>
            }
          />
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
  const sheetRef = useDragToClose<HTMLDivElement>(() => !busy && onClose())

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await finishBook(book.id, rating, review)
      const bonus = !!book.attachment_path || review.trim().length >= SUMMARY_MIN
      toast(bonus ? `Livro na estante. +${BOOK_BONUS} pontos de bônus!` : 'Livro na estante')
      onDone()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={() => !busy && onClose()}>
      <div className="sheet finish-sheet act-leitura" ref={sheetRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Terminar livro">
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

        <BonusBox reviewLength={review.trim().length} hasPdf={!!book.attachment_path} />

        <label>
          Resumo ou o que achou
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Do que fala o livro, o que ficou de lição, se recomendaria…"
          />
          <span className="counter">{review.length}/2000</span>
        </label>
        <p className="muted small">Vai pra sua estante, e o Streak avisa o grupo no feed.</p>
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

/** Aviso do bônus ao terminar: resumo de 140+ letras ou PDF de anotações valem +30. */
function BonusBox({ reviewLength, hasPdf }: { reviewLength: number; hasPdf: boolean }) {
  const done = hasPdf || reviewLength >= SUMMARY_MIN
  const pct = Math.min(100, (reviewLength / SUMMARY_MIN) * 100)
  return (
    <div className={`bonus-box ${done ? 'done' : ''}`} role="status">
      <span className="bonus-box-icon" aria-hidden>
        {done ? <Check size={18} strokeWidth={3} /> : <Sparkles size={18} />}
      </span>
      <div className="bonus-box-text">
        <p className="bonus-box-title">{done ? `+${BOOK_BONUS} pontos garantidos` : `Ganhe +${BOOK_BONUS} pontos`}</p>
        <p className="muted small">
          {hasPdf ? (
            <>
              <FileText size={13} aria-hidden /> Você anexou um PDF de anotações.
            </>
          ) : done ? (
            <>
              <PenLine size={13} aria-hidden /> Resumo com {reviewLength} letras.
            </>
          ) : (
            <>Escreva um resumo com pelo menos {SUMMARY_MIN} letras abaixo, ou anexe um PDF de anotações no livro (dá pra fazer depois, na estante).</>
          )}
        </p>
        {!done && (
          <div className="meter small" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Progresso do livro e, se quiser, total de páginas e página atual. */
function PagesEditor({ book, onSaved }: { book: Book; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [total, setTotal] = useState(book.total_pages ? String(book.total_pages) : '')
  const [current, setCurrent] = useState(book.current_page ? String(book.current_page) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const t = total.trim() ? Number(total) : null
    const c = current.trim() ? Number(current) : null
    if (t !== null && (!Number.isInteger(t) || t < 1 || t > 10000)) return setError('Total de páginas inválido.')
    if (c !== null && (!Number.isInteger(c) || c < 0 || (t !== null && c > t))) return setError('Página atual inválida.')
    setBusy(true)
    setError(null)
    try {
      await setBookPages(book.id, t, c)
      toast('Páginas salvas')
      setEditing(false)
      await onSaved()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!editing)
    return (
      <div className="pages-line">
        {book.total_pages ? (
          book.current_page ? (
            <ReadingProgress page={book.current_page} total={book.total_pages} />
          ) : (
            <p className="muted small">{book.total_pages} páginas · informe a página nas provas de leitura pra ver o progresso.</p>
          )
        ) : (
          <p className="muted small">Informe o total de páginas pra mostrar a porcentagem lida no perfil. É opcional.</p>
        )}
        <button className="link-btn" onClick={() => setEditing(true)}>
          {book.total_pages ? 'Editar páginas' : 'Informar páginas'}
        </button>
      </div>
    )

  return (
    <div className="pages-edit">
      <label>
        Total de páginas
        <input type="number" inputMode="numeric" min={1} max={10000} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="ex: 320" />
      </label>
      <label>
        Página atual
        <input type="number" inputMode="numeric" min={0} max={10000} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="ex: 45" />
      </label>
      {error && <p className="msg error">{error}</p>}
      <div className="row">
        <button className="btn ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancelar
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
