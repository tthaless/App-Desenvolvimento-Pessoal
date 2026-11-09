import { useCallback, useEffect, useState } from 'react'
import { fetchGroupFinished } from '../lib/books'
import type { Book } from '../lib/books'
import { errorMessage } from '../lib/utils'
import Bookshelf from './Bookshelf'
import Library from './Library'
import TopBar from './TopBar'
import { SkeletonRows } from './Skeleton'
import { clearNavTarget, useNavTarget } from '../lib/notifications'

type Sub = 'minha' | 'grupo'

/** Aba Leitura: minha biblioteca e o que o grupo leu. */
export default function ReadingTab({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Sub>('minha')
  const target = useNavTarget()

  // Curtida ou "quero ler também" abre a minha biblioteca.
  useEffect(() => {
    if (target?.type !== 'library') return
    setSub('minha')
    clearNavTarget()
  }, [target])

  return (
    <div className="reading">
      <TopBar title="Leitura" />
      <nav className="subtabs" aria-label="Seções da leitura">
        {(
          [
            ['minha', 'Biblioteca'],
            ['grupo', 'Do grupo'],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)} aria-current={sub === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>
      {sub === 'minha' && <Library ownerId={userId} viewerId={userId} />}
      {sub === 'grupo' && <GroupLibrary userId={userId} />}
    </div>
  )
}

function GroupLibrary({ userId }: { userId: string }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setBooks(await fetchGroupFinished())
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="section shelf act-leitura">
      <div className="shelf-head">
        <h2 className="section-label">Lidos pelo grupo</h2>
        {books.length > 0 && <span className="muted small">{books.length} recentes</span>}
      </div>
      {error && <p className="msg error">{error}</p>}
      {!loaded && <SkeletonRows count={4} cover />}
      {loaded && <Bookshelf books={books} viewerId={userId} onChanged={load} showReader emptyText="Ninguém terminou um livro ainda." />}
    </section>
  )
}
