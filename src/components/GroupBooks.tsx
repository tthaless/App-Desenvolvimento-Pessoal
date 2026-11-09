import { useCallback, useEffect, useState } from 'react'
import { fetchGroupFinished } from '../lib/books'
import type { Book } from '../lib/books'
import { errorMessage } from '../lib/utils'
import Bookshelf from './Bookshelf'
import { SkeletonRows } from './Skeleton'

/** Últimos livros que o grupo terminou. */
export default function GroupBooks({ userId }: { userId: string }) {
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
        <h2 className="section-heading">O grupo leu</h2>
        {books.length > 0 && <span className="muted small">{books.length} recentes</span>}
      </div>
      {error && <p className="msg error">{error}</p>}
      {!loaded && <SkeletonRows count={4} cover />}
      {loaded && <Bookshelf books={books} viewerId={userId} onChanged={load} showReader emptyText="Ninguém terminou um livro ainda." />}
    </section>
  )
}
