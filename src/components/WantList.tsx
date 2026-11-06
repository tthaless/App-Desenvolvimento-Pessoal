import { useState } from 'react'
import { addWant, removeWant, sameTitle, startFromWant } from '../lib/books'
import type { BookDraft, WantItem } from '../lib/books'
import { refreshMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import BookCover from './BookCover'
import BookSearch from './BookSearch'
import { Bookmark, Check, Plus, X } from 'lucide-react'

interface Props {
  ownerId: string
  viewerId: string
  /** Listas de todo o grupo. */
  all: WantItem[]
  onChanged: () => void
  onStarted: () => void
}

/** Lista "Quero ler": na minha, adicionar, começar e tirar; na dos amigos, "quero ler também". */
export default function WantList({ ownerId, viewerId, all, onChanged, onStarted }: Props) {
  const isMe = ownerId === viewerId
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = all.filter((w) => w.user_id === ownerId)
  const mine = all.filter((w) => w.user_id === viewerId)
  const othersWanting = (title: string) => all.filter((w) => w.user_id !== ownerId && sameTitle(w.title, title)).length

  async function run(key: string, fn: () => Promise<void>, after = onChanged) {
    setBusy(key)
    setError(null)
    try {
      await fn()
      after()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="section want act-leitura">
      <div className="shelf-head">
        <h2 className="section-label">Quero ler</h2>
        {isMe && !adding && (
          <button className="btn ghost small-btn" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden /> Adicionar
          </button>
        )}
      </div>
      {error && <p className="msg error">{error}</p>}
      {adding && (
        <BookSearch
          submitLabel="Pôr na lista"
          busy={busy === 'add'}
          onCancel={() => setAdding(false)}
          onSubmit={(draft: BookDraft) =>
            run('add', async () => {
              await addWant(draft)
              setAdding(false)
            })
          }
        />
      )}
      {items.length === 0 && !adding && (
        <p className="muted small">{isMe ? 'Sua lista está vazia.' : 'Lista vazia.'}</p>
      )}
      <ul className="want-list">
        {items.map((w) => {
          const others = othersWanting(w.title)
          const alreadyMine = mine.some((m) => sameTitle(m.title, w.title))
          return (
            <li key={w.id}>
              <BookCover url={w.cover_url} title={w.title} size="sm" />
              <div className="want-info">
                <span className="shelf-title">{w.title}</span>
                {w.author && <span className="muted small">{w.author}</span>}
                {others > 0 && (
                  <span className="muted small">
                    {others} {others === 1 ? 'pessoa também quer' : 'pessoas também querem'}
                  </span>
                )}
              </div>
              {isMe ? (
                <div className="want-actions">
                  <button
                    className="btn primary small-btn"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        w.id,
                        () => startFromWant(w.id),
                        () => {
                          onChanged()
                          onStarted()
                          refreshMembers().catch(() => {})
                        },
                      )
                    }
                  >
                    Começar
                  </button>
                  <button className="icon-btn" disabled={!!busy} onClick={() => run(w.id, () => removeWant(w.id))} aria-label={`Tirar ${w.title} da lista`}>
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ) : alreadyMine ? (
                <span className="want-done">
                  <Check size={14} strokeWidth={3} aria-hidden /> Na sua lista
                </span>
              ) : (
                <button
                  className="btn ghost small-btn want-too"
                  disabled={!!busy}
                  onClick={() => run(w.id, () => addWant({ title: w.title, author: w.author ?? '', cover_url: w.cover_url }))}
                >
                  <Bookmark size={15} aria-hidden /> Quero ler também
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
