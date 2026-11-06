import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openProfile } from '../lib/members'
import { timeAgo } from '../lib/utils'
import { ACTIVITY } from '../types'
import type { Member, Post } from '../types'
import Avatar from './Avatar'

interface Props {
  posts: Post[]
  start: number
  currentUserId: string
  members: Member[]
  onSeen: (id: string) => void
  onClose: () => void
}

const DURATION = 5000

export default function StoryViewer({ posts, start, currentUserId, members, onSeen, onClose }: Props) {
  const [index, setIndex] = useState(start)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const post = posts[index]

  // Links temporários (1h) para as fotos, que ficam num bucket privado.
  useEffect(() => {
    const paths = posts.map((p) => p.photo_path)
    supabase.storage
      .from('provas')
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach((d) => {
          if (d.path && d.signedUrl) map[d.path] = d.signedUrl
        })
        setUrls(map)
      })
  }, [posts])

  useEffect(() => {
    if (post) onSeen(post.id)
  }, [post, onSeen])

  // Avança sozinho 5s depois que a foto carregou.
  useEffect(() => {
    if (!post || loadedId !== post.id) return
    const t = setTimeout(() => next(), DURATION)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId, post])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function next() {
    if (index >= posts.length - 1) onClose()
    else setIndex(index + 1)
  }
  function prev() {
    if (index > 0) setIndex(index - 1)
  }

  if (!post) return null

  // Barras de progresso só das fotos da mesma pessoa.
  const sameUser = posts.map((p, i) => ({ p, i })).filter(({ p }) => p.user_id === post.user_id)
  const member = members.find((m) => m.id === post.user_id)
  const name = post.user_id === currentUserId ? 'Você' : (member?.username ?? '?')
  const url = urls[post.photo_path]
  const act = ACTIVITY[post.activity]

  return (
    <div className="viewer" role="dialog" aria-label={`Story de ${name}`}>
      <div className="viewer-bars">
        {sameUser.map(({ p, i }) => (
          <span key={p.id} className="bar">
            <span
              className={`fill ${i < index ? 'full' : i === index && loadedId === post.id ? 'run' : ''}`}
              style={{ animationDuration: `${DURATION}ms` }}
            />
          </span>
        ))}
      </div>
      <div className="viewer-head">
        <button
          className="viewer-user"
          onClick={() => {
            onClose()
            openProfile(post.user_id)
          }}
        >
          <Avatar name={member?.username ?? '?'} url={member?.avatar_url} size="sm" />
          <strong>{name}</strong>
        </button>
        <span className={`chip act-${post.activity}`}>
          {act.emoji} {act.label}
        </span>
        <span className="muted">{timeAgo(post.created_at)}</span>
        <button className="viewer-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="viewer-photo">
        {url ? (
          <img key={post.id} src={url} alt={post.caption ?? `Prova de ${name}`} onLoad={() => setLoadedId(post.id)} />
        ) : (
          <span className="muted">Carregando…</span>
        )}
      </div>

      {post.caption && <p className="viewer-caption">{post.caption}</p>}

      <button className="tap left" onClick={prev} aria-label="Anterior" />
      <button className="tap right" onClick={next} aria-label="Próxima" />
    </div>
  )
}
