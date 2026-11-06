import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openProfile, useMembers } from '../lib/members'
import { useSignedUrls } from '../lib/signed'
import { createComment, deleteComment, fetchComments } from '../lib/feed'
import type { FeedComment, FeedPost } from '../lib/feed'
import { errorMessage, timeAgo } from '../lib/utils'
import Avatar from './Avatar'
import Composer from './Composer'
import FeedPostCard from './FeedPostCard'

interface Props {
  post: FeedPost
  userId: string
  onClose: () => void
  onChanged: () => void
}

/** Post aberto com os comentários e a caixa para comentar. */
export default function PostThread({ post, userId, onClose, onChanged }: Props) {
  const [comments, setComments] = useState<FeedComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const urls = useSignedUrls([post.photo_path, ...comments.map((c) => c.photo_path)])

  const load = useCallback(async () => {
    try {
      setComments(await fetchComments(post.id))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [post.id])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`thread-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${post.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [post.id, load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet thread" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Comentários">
        <div className="thread-head">
          <span className="sheet-grip" aria-hidden />
          <button className="viewer-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <FeedPostCard
          post={post}
          userId={userId}
          photoUrl={post.photo_path ? urls[post.photo_path] : undefined}
          onDeleted={() => {
            onChanged()
            onClose()
          }}
        />
        <div className="thread-comments">
          {error && <p className="msg error">{error}</p>}
          {comments.length === 0 && !error && <p className="muted small center">Nenhum comentário ainda.</p>}
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} userId={userId} photoUrl={c.photo_path ? urls[c.photo_path] : undefined} onChanged={load} />
          ))}
        </div>
        <div className="thread-composer">
          <Composer
            placeholder="Escreva um comentário"
            submitLabel="Comentar"
            onSubmit={async (body, file) => {
              await createComment(userId, post.id, body, file)
              await load()
              onChanged()
            }}
          />
        </div>
      </div>
    </div>
  )
}

function CommentItem({ comment, userId, photoUrl, onChanged }: { comment: FeedComment; userId: string; photoUrl?: string; onChanged: () => void }) {
  const author = useMembers().find((m) => m.id === comment.user_id)
  const name = author?.username ?? '?'
  async function remove() {
    if (!confirm('Apagar este comentário?')) return
    try {
      await deleteComment(comment)
      onChanged()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <div className="comment">
      <button className="post-avatar" onClick={() => openProfile(comment.user_id)} aria-label={`Perfil de ${name}`}>
        <Avatar name={name} url={author?.avatar_url} size="sm" />
      </button>
      <div className="comment-main">
        <div className="comment-bubble">
          <button className="post-name" onClick={() => openProfile(comment.user_id)}>
            {name}
          </button>
          {comment.body && <p className="post-body">{comment.body}</p>}
          {comment.photo_path && <div className="post-photo">{photoUrl && <img src={photoUrl} alt="" loading="lazy" />}</div>}
        </div>
        <div className="comment-actions">
          <span className="muted">{timeAgo(comment.created_at)}</span>
          {comment.user_id === userId && (
            <button className="action small" onClick={remove}>
              Apagar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
