import { useState } from 'react'
import { Clock, Heart, MessageCircle, Star, Trash2 } from 'lucide-react'
import { openProfile, useMembers } from '../lib/members'
import { formatRating, setBookLike } from '../lib/books'
import type { Book } from '../lib/books'
import { deletePost, expiresIn } from '../lib/feed'
import type { FeedBook, FeedPost } from '../lib/feed'
import { errorMessage, timeAgo } from '../lib/utils'
import Avatar from './Avatar'
import BookCover from './BookCover'
import { PotionMark } from './Logo'
import PdfAttachment from './PdfAttachment'
import { SkeletonBlock } from './Skeleton'

interface Props {
  post: FeedPost
  userId: string
  photoUrl?: string
  onOpenThread?: () => void
  onDeleted?: () => void
}

export default function FeedPostCard({ post, userId, photoUrl, onOpenThread, onDeleted }: Props) {
  if (post.kind === 'livro' && post.book) {
    return <BookFinishedPost post={post} book={post.book} userId={userId} onOpenThread={onOpenThread} />
  }
  return <UserPost post={post} userId={userId} photoUrl={photoUrl} onOpenThread={onOpenThread} onDeleted={onDeleted} />
}

function UserPost({ post, userId, photoUrl, onOpenThread, onDeleted }: Props) {
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
              <Trash2 size={16} />
            </button>
          )}
        </header>
        {post.body && <p className="post-body">{post.body}</p>}
        {post.photo_path && (
          <div className="post-photo">{photoUrl ? <img src={photoUrl} alt="" loading="lazy" /> : <SkeletonBlock height={240} radius={0} />}</div>
        )}
        <footer className="post-actions">
          {onOpenThread && (
            <button className="action" onClick={onOpenThread}>
              <MessageCircle size={19} aria-hidden /> {post.comments > 0 && post.comments}
            </button>
          )}
          <span className="expires">
            <Clock size={13} aria-hidden /> {expiresIn(post.created_at)}
          </span>
        </footer>
      </div>
    </article>
  )
}

/** Aviso automático do Streak: alguém terminou um livro. A curtida conta na estante dela. */
function BookFinishedPost({ post, book, userId, onOpenThread }: { post: FeedPost; book: FeedBook; userId: string; onOpenThread?: () => void }) {
  const reader = useMembers().find((m) => m.id === book.user_id)
  const own = book.user_id === userId
  const [liked, setLiked] = useState(book.likes.includes(userId))
  const [count, setCount] = useState(book.likes.length)
  const [synced, setSynced] = useState(book.likes)

  // Atualiza quando chegam curtidas de outras pessoas.
  if (synced !== book.likes) {
    setSynced(book.likes)
    setLiked(book.likes.includes(userId))
    setCount(book.likes.length)
  }

  async function toggle() {
    if (own) return
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    try {
      await setBookLike(book.id, userId, next)
    } catch (e) {
      setLiked(!next)
      setCount((c) => c + (next ? -1 : 1))
      alert(errorMessage(e))
    }
  }

  // O anexo usa o mesmo componente da estante.
  const asBook = { ...book, likes: count, started_at: '', finished_at: null, abandoned_at: null, proofs: 0 } as Book

  return (
    <article className="post post-auto">
      <span className="streak-avatar" aria-hidden>
        <PotionMark size={26} />
      </span>
      <div className="post-main">
        <header className="post-head">
          <span className="post-name">Streak</span>
          <span className="auto-tag">automático</span>
          <span className="muted">· {timeAgo(post.created_at)}</span>
        </header>
        <p className="post-body">
          <button className="inline-name" onClick={() => openProfile(book.user_id)}>
            {reader?.username ?? '?'}
          </button>{' '}
          terminou de ler
        </p>
        <div className="auto-book">
          <BookCover url={book.cover_url} title={book.title} size="md" />
          <div className="auto-book-info">
            <span className="shelf-title">{book.title}</span>
            {book.author && <span className="muted small">{book.author}</span>}
            {book.rating !== null && (
              <span className="auto-rating">
                <Star size={15} fill="currentColor" aria-hidden /> {formatRating(book.rating)}/10
              </span>
            )}
          </div>
        </div>
        {book.review && <p className="auto-review">“{book.review}”</p>}
        {book.attachment_path && <PdfAttachment book={asBook} viewerId={userId} onChanged={() => {}} />}
        <footer className="post-actions">
          <button
            className={`action ${liked ? 'liked' : ''}`}
            onClick={toggle}
            disabled={own}
            aria-pressed={liked}
            title={own ? 'As curtidas vão pra sua estante' : 'Curtir'}
          >
            <Heart size={19} fill={liked || (own && count > 0) ? 'currentColor' : 'none'} aria-hidden /> {count > 0 && count}
          </button>
          {onOpenThread && (
            <button className="action" onClick={onOpenThread}>
              <MessageCircle size={19} aria-hidden /> {post.comments > 0 && post.comments}
            </button>
          )}
          <span className="expires">
            <Clock size={13} aria-hidden /> {expiresIn(post.created_at)}
          </span>
        </footer>
      </div>
    </article>
  )
}
