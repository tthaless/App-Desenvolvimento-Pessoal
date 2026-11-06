import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMembers } from '../lib/members'
import { loadSeen, saveSeen } from '../lib/utils'
import type { Post } from '../types'
import Avatar from './Avatar'
import StoryViewer from './StoryViewer'

/** Barra única de stories: provas de exercício e leitura das últimas 24h. */
export default function Stories({ userId }: { userId: string }) {
  const members = useMembers()
  const [posts, setPosts] = useState<Post[]>([])
  const [loaded, setLoaded] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(loadSeen)
  const [viewerStart, setViewerStart] = useState<number | null>(null)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('posts')
      .select('id,user_id,activity,photo_path,caption,created_at,day')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
    setPosts((data ?? []) as Post[])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  // Os meus primeiro, depois quem postou mais recente.
  const { flat, circles } = useMemo(() => {
    const byUser = new Map<string, Post[]>()
    for (const post of posts) {
      const list = byUser.get(post.user_id) ?? []
      list.push(post)
      byUser.set(post.user_id, list)
    }
    const groups = [...byUser.values()].sort((a, b) => {
      if (a[0].user_id === userId) return -1
      if (b[0].user_id === userId) return 1
      return b[b.length - 1].created_at.localeCompare(a[a.length - 1].created_at)
    })
    let index = 0
    const circles = groups.map((g) => {
      const start = index
      index += g.length
      return { userId: g[0].user_id, start, ids: g.map((p) => p.id) }
    })
    return { flat: groups.flat(), circles }
  }, [posts, userId])

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      saveSeen(next)
      return next
    })
  }, [])

  const memberOf = (id: string) => members.find((m) => m.id === id)

  return (
    <>
      <section className="stories" aria-label="Stories das últimas 24 horas">
        {circles.length === 0 && loaded && <p className="muted small">Ninguém postou nas últimas 24h. Seja o primeiro.</p>}
        {circles.map((c) => {
          const m = memberOf(c.userId)
          const name = m?.username ?? '?'
          return (
            <button
              key={c.userId}
              className={`story ${c.ids.some((id) => !seen.has(id)) ? 'unseen' : ''}`}
              onClick={() => setViewerStart(c.start)}
            >
              <Avatar name={name} url={m?.avatar_url} size="lg" />
              <span className="story-name">{c.userId === userId ? 'Você' : name}</span>
            </button>
          )
        })}
      </section>

      {viewerStart !== null && flat.length > 0 && (
        <StoryViewer
          posts={flat}
          start={viewerStart}
          currentUserId={userId}
          members={members}
          onSeen={markSeen}
          onClose={() => setViewerStart(null)}
        />
      )}
    </>
  )
}
