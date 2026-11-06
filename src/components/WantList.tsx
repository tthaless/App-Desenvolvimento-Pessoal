import { useState } from 'react'
import { addWant, removeWant, sameTitle, startFromWant } from '../lib/books'
import type { BookDraft, WantItem } from '../lib/books'
import { refreshMembers, useMembers } from '../lib/members'
import Avatar from './Avatar'
import { errorMessage } from '../lib/utils'
import BookCover from './BookCover'
import BookSearch from './BookSearch'
import { Bookmark, Check, Plus, X } from 'lucide-react'
import { SkeletonRows } from './Skeleton'

interface Props {
  loading?: boolean
  ownerId: string
  viewerId: string
  /** Listas de todo o grupo. */
  all: WantItem[]
  onChanged: () => void
  onStarted: () => void
}

/** "andre também quer", "andre e joao também querem", "andre, joao… também querem". */
function wantText(names: string[], full: boolean) {
  const verb = names.length === 1 && names[0] !== 'você' ? 'também quer' : 'também querem'
  if (names.length === 1) return names[0] === 'você' ? 'você também quer' : `${names[0]} ${verb}`
  if (names.length === 2) return `${names[0]} e ${names[1]} ${verb}`
  if (full) return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]} ${verb}`
  return `${names[0]}, ${names[1]}… ${verb}`
}

/** Lista "Quero ler": na minha, adicionar, começar e tirar; na dos amigos, "quero ler também". */
export default function WantList({ loading, ownerId, viewerId, all, onChanged, onStarted }: Props) {
  const isMe = ownerId === viewerId
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = all.filter((w) => w.user_id === ownerId)
  const mine = all.filter((w) => w.user_id === viewerId)
  const members = useMembers()
  const [expanded, setExpanded] = useState<string | null>(null)
  // Quem mais do grupo tem esse livro na lista (eu primeiro, se for o caso).
  const othersWanting = (title: string) =>
    all
      .filter((w) => w.user_id !== ownerId && sameTitle(w.title, title))
      .map((w) => members.find((m) => m.id === w.user_id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .sort((a, b) => (a.id === viewerId ? -1 : b.id === viewerId ? 1 : 0))

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
      {loading && <SkeletonRows count={2} cover />}
      {!loading && items.length === 0 && !adding && (
        <p className="muted small">{isMe ? 'Sua lista está vazia.' : 'Lista vazia.'}</p>
      )}
      <ul className="want-list want-paper">
        {items.map((w) => {
          const others = othersWanting(w.title)
          const alreadyMine = mine.some((m) => sameTitle(m.title, w.title))
          return (
            <li key={w.id}>
              <BookCover url={w.cover_url} title={w.title} size="sm" />
              <div className="want-info">
                <span className="shelf-title">{w.title}</span>
                {w.author && <span className="muted small">{w.author}</span>}
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
                  onClick={() => run(w.id, () => addWant({ title: w.title, author: w.author ?? '', cover_url: w.cover_url }, w.user_id))}
                >
                  <Bookmark size={15} aria-hidden /> Quero ler também
                </button>
              )}
                {others.length > 0 && (
                  <button
                    className="want-others"
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    aria-expanded={expanded === w.id}
                  >
                    <span className="want-avatars" aria-hidden>
                      {others.slice(0, 3).map((m) => (
                        <Avatar key={m.id} name={m.username} url={m.avatar_url} size="sm" />
                      ))}
                    </span>
                    <span className="want-names">{wantText(others.map((m) => (m.id === viewerId ? 'você' : m.username)), expanded === w.id)}</span>
                  </button>
                )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
