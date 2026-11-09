import { useCallback, useEffect, useState } from 'react'
import { fetchGroupFinished } from '../lib/books'
import type { Book } from '../lib/books'
import { errorMessage } from '../lib/utils'
import { createPost } from '../lib/feed'
import { useMembers } from '../lib/members'
import Avatar from './Avatar'
import Composer from './Composer'
import FeedList from './FeedList'
import Bookshelf from './Bookshelf'
import Library from './Library'
import TopBar from './TopBar'
import { SkeletonRows } from './Skeleton'
import { clearNavTarget, useNavTarget } from '../lib/notifications'

type Sub = 'feed' | 'minha' | 'grupo'

/** Aba Leitura: feed do grupo, minha biblioteca e o que o grupo leu. */
export default function ReadingTab({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Sub>('feed')
  const target = useNavTarget()

  // Curtida ou "quero ler também" abre a minha biblioteca; comentário no feed abre o feed
  // (o próprio feed abre o post e limpa o aviso).
  useEffect(() => {
    if (target?.type === 'library') {
      setSub('minha')
      clearNavTarget()
    } else if (target?.type === 'feed') setSub('feed')
  }, [target])

  return (
    <div className="reading">
      <TopBar title="Leitura" />
      <nav className="subtabs three" aria-label="Seções da leitura">
        {(
          [
            ['feed', 'Feed'],
            ['minha', 'Biblioteca'],
            ['grupo', 'Do grupo'],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)} aria-current={sub === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>
      {sub === 'feed' && <GroupFeed userId={userId} />}
      {sub === 'minha' && <Library ownerId={userId} viewerId={userId} />}
      {sub === 'grupo' && <GroupLibrary userId={userId} />}
    </div>
  )
}

function GroupFeed({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="feed">
      <section className="card new-post">
        <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="md" />
        <Composer
          placeholder="O que está lendo ou aprendendo?"
          submitLabel="Postar"
          onSubmit={async (body, file) => {
            await createPost(userId, body, file)
            setRefreshKey((k) => k + 1)
          }}
        />
      </section>
      <FeedList userId={userId} emptyText="Nada no feed nas últimas 24h. Puxa o assunto!" refreshKey={refreshKey} />
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
