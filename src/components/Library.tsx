import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchCurrentBook, fetchShelf, fetchWantLists } from '../lib/books'
import type { Book, WantItem } from '../lib/books'
import { useMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import BookCover from './BookCover'
import Bookshelf from './Bookshelf'
import CurrentBook from './CurrentBook'
import PdfAttachment from './PdfAttachment'
import WantList from './WantList'

/** Biblioteca de uma pessoa: contadores, lendo agora, quero ler e concluídos. */
export default function Library({ ownerId, viewerId }: { ownerId: string; viewerId: string }) {
  const isMe = ownerId === viewerId
  const owner = useMembers().find((m) => m.id === ownerId)
  const [shelf, setShelf] = useState<Book[]>([])
  const [current, setCurrent] = useState<Book | null>(null)
  const [wants, setWants] = useState<WantItem[]>([])
  const [currentKey, setCurrentKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadShelf = useCallback(async () => {
    try {
      setShelf(await fetchShelf(ownerId))
      if (!isMe) setCurrent(await fetchCurrentBook(ownerId))
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [ownerId, isMe])

  const loadWants = useCallback(async () => {
    try {
      setWants(await fetchWantLists())
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    loadShelf()
    loadWants()
    const channel = supabase
      .channel(`biblioteca-${ownerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'want_to_read' }, () => loadWants())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_likes' }, () => loadShelf())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerId, loadShelf, loadWants])

  const wantCount = wants.filter((w) => w.user_id === ownerId).length
  const likes = shelf.reduce((sum, b) => sum + b.likes, 0)
  const avg = shelf.length ? shelf.reduce((s, b) => s + (b.rating ?? 0), 0) / shelf.length : 0

  return (
    <div className="library">
      <section className="lib-counters" aria-label="Resumo da biblioteca">
        <div>
          <strong>{shelf.length}</strong>
          <span>concluídos</span>
        </div>
        <div>
          <strong>{current ? 1 : 0}</strong>
          <span>lendo</span>
        </div>
        <div>
          <strong>{wantCount}</strong>
          <span>quero ler</span>
        </div>
        <div>
          <strong>{likes}</strong>
          <span>curtidas</span>
        </div>
      </section>

      {error && <p className="msg error">{error}</p>}

      {isMe ? (
        <CurrentBook userId={ownerId} refreshKey={currentKey} onShelfChanged={loadShelf} onLoaded={setCurrent} />
      ) : (
        current && (
          <section className="card current-book act-leitura">
            <p className="muted small">📖 Lendo agora</p>
            <div className="current-top">
              <BookCover url={current.cover_url} title={current.title} size="lg" />
              <div className="current-info">
                <p className="book-title">{current.title}</p>
                {current.author && <p className="muted small">{current.author}</p>}
              </div>
            </div>
            <PdfAttachment book={current} viewerId={viewerId} onChanged={loadShelf} />
          </section>
        )
      )}

      <WantList ownerId={ownerId} viewerId={viewerId} all={wants} onChanged={loadWants} onStarted={() => setCurrentKey((k) => k + 1)} />

      <section className="card shelf act-leitura">
        <div className="shelf-head">
          <h2>📚 Concluídos</h2>
          {shelf.length > 0 && <span className="muted small">média {avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>}
        </div>
        <Bookshelf
          books={shelf}
          viewerId={viewerId}
          onChanged={loadShelf}
          emptyText={isMe ? 'Termine um livro pra ele aparecer aqui.' : `${owner?.username ?? 'Essa pessoa'} ainda não terminou nenhum livro.`}
        />
      </section>
    </div>
  )
}
