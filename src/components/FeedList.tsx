import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSignedUrls } from '../lib/signed'
import { fetchPosts } from '../lib/feed'
import type { FeedPost } from '../lib/feed'
import { errorMessage } from '../lib/utils'
import FeedPostCard from './FeedPostCard'
import PostThread from './PostThread'

interface Props {
  userId: string
  /** Mostra só os posts desta pessoa (no perfil). */
  authorId?: string
  emptyText: string
  /** Muda quando alguém posta por aqui, para recarregar na hora. */
  refreshKey?: number
}

export default function FeedList({ userId, authorId, emptyText, refreshKey }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const urls = useSignedUrls(posts.map((p) => p.photo_path))

  const load = useCallback(async () => {
    try {
      setPosts(await fetchPosts(authorId))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [authorId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    // Várias mudanças seguidas viram um só recarregamento.
    const reload = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(load, 300)
    }
    const channel = supabase
      .channel(`feed-${authorId ?? 'todos'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_comments' }, reload)
      .subscribe()
    // O tempo restante ("some em 3h") e os posts expirados também mudam sozinhos.
    const tick = setInterval(load, 5 * 60 * 1000)
    return () => {
      clearTimeout(timer.current)
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [authorId, load])

  const open = posts.find((p) => p.id === openId)

  return (
    <>
      {error && <p className="msg error">{error}</p>}
      {loaded && posts.length === 0 && !error && <p className="muted small center empty">{emptyText}</p>}
      <div className="feed-list">
        {posts.map((p) => (
          <FeedPostCard
            key={p.id}
            post={p}
            userId={userId}
            photoUrl={p.photo_path ? urls[p.photo_path] : undefined}
            onOpenThread={() => setOpenId(p.id)}
            onDeleted={load}
          />
        ))}
      </div>
      {open && <PostThread post={open} userId={userId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  )
}
