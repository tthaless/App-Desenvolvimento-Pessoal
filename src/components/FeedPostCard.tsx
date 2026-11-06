import { openProfile, useMembers } from '../lib/members'
import { deletePost, expiresIn } from '../lib/feed'
import type { FeedPost } from '../lib/feed'
import { errorMessage, timeAgo } from '../lib/utils'
import Avatar from './Avatar'

interface Props {
  post: FeedPost
  userId: string
  photoUrl?: string
  onOpenThread?: () => void
  onDeleted?: () => void
}

export default function FeedPostCard({ post, userId, photoUrl, onOpenThread, onDeleted }: Props) {
  const author = useMembers().find((m) => m.id === post.user_id)
  async function remove() {
    if (!confirm('Apagar este post?')) return
    try {
      await deletePost(post)
      onDeleted?.()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  const name = author?.username ?? '?'

  return (
    <article className="post">
      <button className="post-avatar" onClick={() => openProfile(post.user_id)} aria-label={`Perfil de ${name}`}>
        <Avatar name={name} url={author?.avatar_url} size="md" />
      </button>
      <div className="post-main">
        <header className="post-head">
          <button className="post-name" onClick={() => openProfile(post.user_id)}>
            {name}
          </button>
          <span className="muted">· {timeAgo(post.created_at)}</span>
          {post.user_id === userId && (
            <button className="post-delete" onClick={remove} aria-label="Apagar post">
              🗑
            </button>
          )}
        </header>
        {post.body && <p className="post-body">{post.body}</p>}
        {post.photo_path && (
          <div className="post-photo">{photoUrl ? <img src={photoUrl} alt="" loading="lazy" /> : <span className="muted small">Carregando foto…</span>}</div>
        )}
        <footer className="post-actions">
          {onOpenThread && (
            <button className="action" onClick={onOpenThread}>
              <span aria-hidden>💬</span> {post.comments > 0 && post.comments}
            </button>
          )}
          <span className="expires">⏳ {expiresIn(post.created_at)}</span>
        </footer>
      </div>
    </article>
  )
}
