import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMembers } from '../lib/members'
import { loadSeen, saveSeen } from '../lib/utils'
import type { StoryItem } from '../types'
import Avatar from './Avatar'
import StoryViewer from './StoryViewer'
import { SkeletonStories } from './Skeleton'
import { clearNavTarget, useNavTarget } from '../lib/notifications'

/** Barra única de stories: provas de exercício, leitura e desafio das últimas 24h. */
export default function Stories({ userId }: { userId: string }) {
  const members = useMembers()
  const [posts, setPosts] = useState<StoryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(loadSeen)
  const [viewerStart, setViewerStart] = useState<number | null>(null)
  const [startInChat, setStartInChat] = useState(false)
  const target = useNavTarget()

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [provas, desafios] = await Promise.all([
      supabase
        .from('posts')
        .select('id,user_id,activity,photo_path,caption,created_at')
        .gte('created_at', since),
      supabase
        .from('challenge_checkins')
        .select('idea_id,user_id,day,photo_path,created_at,challenge_ideas(title)')
        .gte('created_at', since),
    ])
    const items: StoryItem[] = [
      ...((provas.data ?? []) as Omit<StoryItem, 'key'>[]).map((p) => ({ ...p, key: `post:${p.id}` })),
      ...(desafios.data ?? []).map((row) => {
        const c = row as unknown as { idea_id: string; user_id: string; day: string; photo_path: string; created_at: string; challenge_ideas: { title: string } | null }
        return {
          id: `desafio-${c.idea_id}-${c.user_id}-${c.day}`,
          key: `desafio:${c.idea_id}:${c.user_id}:${c.day}`,
          user_id: c.user_id,
          activity: 'desafio' as const,
          photo_path: c.photo_path,
          caption: c.challenge_ideas?.title ?? null,
          created_at: c.created_at,
        }
      }),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at))
    setPosts(items)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_checkins' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  // Os meus primeiro, depois quem postou mais recente.
  const { flat, circles } = useMemo(() => {
    const byUser = new Map<string, StoryItem[]>()
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

  // Aviso de comentário abre o story direto na conversa.
  useEffect(() => {
    if (!loaded || target?.type !== 'story') return
    clearNavTarget()
    const i = flat.findIndex((p) => p.key === target.key)
    if (i >= 0) {
      setStartInChat(true)
      setViewerStart(i)
    }
  }, [loaded, target, flat])

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
        {!loaded && <SkeletonStories />}
        {circles.length === 0 && loaded && <p className="muted small">Ninguém postou nas últimas 24h. Seja o primeiro.</p>}
        {circles.map((c) => {
          const m = memberOf(c.userId)
          const name = m?.username ?? '?'
          return (
            <button
              key={c.userId}
              className={`story ${c.ids.some((id) => !seen.has(id)) ? 'unseen' : ''}`}
              onClick={() => {
                setStartInChat(false)
                setViewerStart(c.start)
              }}
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
          startInChat={startInChat}
          currentUserId={userId}
          members={members}
          onSeen={markSeen}
          onClose={() => setViewerStart(null)}
        />
      )}
    </>
  )
}
