import { useCallback, useEffect, useState } from 'react'
import { openProfile } from '../lib/members'
import { fetchCommentCounts } from '../lib/storyComments'
import { signPaths } from '../lib/signed'
import { timeAgo } from '../lib/utils'
import { STORY_LABEL } from '../types'
import type { Member, StoryItem } from '../types'
import Avatar from './Avatar'
import StoryChat from './StoryChat'
import { Images, MessageCircle, Trash2, X } from 'lucide-react'
import { deleteStory } from '../lib/stories'
import { errorMessage } from '../lib/utils'
import ActivityIcon from './ActivityIcon'
import { useDragToClose } from '../lib/useDragToClose'
import { SkeletonBlock } from './Skeleton'

interface Props {
  posts: StoryItem[]
  start: number
  /** Abre já com os comentários (vindo de um aviso). */
  startInChat?: boolean
  currentUserId: string
  members: Member[]
  onSeen: (id: string) => void
  onClose: () => void
  /** Depois de apagar uma prova minha. */
  onDeleted?: (item: StoryItem) => void
}

const DURATION = 5000

export default function StoryViewer({ posts, start, startInChat = false, currentUserId, members, onSeen, onClose, onDeleted }: Props) {
  const [index, setIndex] = useState(start)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(startInChat)
  const viewerRef = useDragToClose<HTMLDivElement>(onClose, !chatOpen)
  // Muda ao fechar o chat, para o story recomeçar a contagem.
  const [round, setRound] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Pausa enquanto lê os comentários ou confirma a exclusão.
  const paused = chatOpen || confirming
  const post = posts[index]

  const refreshCounts = useCallback(() => {
    fetchCommentCounts(posts.map((p) => p.key)).then(setCounts)
  }, [posts])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  // Links temporários (1h) para as fotos, que ficam num bucket privado.
  useEffect(() => {
    let active = true
    signPaths(posts.map((p) => p.photo_path)).then((u) => active && setUrls(u))
    return () => {
      active = false
    }
  }, [posts])

  useEffect(() => {
    if (post) onSeen(post.id)
  }, [post, onSeen])

  // Avança sozinho 5s depois que a foto carregou, menos com os comentários abertos.
  useEffect(() => {
    if (!post || loadedId !== post.id || paused) return
    const t = setTimeout(() => next(), DURATION)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId, post, paused, round])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (chatOpen) return
      if (e.key === 'Escape') return confirming ? cancelDelete() : onClose()
      if (confirming) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function closeChat() {
    setChatOpen(false)
    setRound((r) => r + 1)
  }

  function cancelDelete() {
    setConfirming(false)
    setDeleteError(null)
    setRound((r) => r + 1)
  }

  async function confirmDelete() {
    if (!post) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteStory(post)
      onDeleted?.(post)
      onClose()
    } catch (e) {
      setDeleteError(errorMessage(e))
      setDeleting(false)
    }
  }

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

  return (
    <div className="viewer" ref={viewerRef} role="dialog" aria-label={`Story de ${name}`}>
      <div className="viewer-bars">
        {sameUser.map(({ p, i }) => (
          <span key={p.id} className="bar">
            <span
              key={`${p.id}-${round}`}
              className={`fill ${i < index ? 'full' : i === index && loadedId === post.id ? `run ${paused ? 'paused' : ''}` : ''}`}
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
          <ActivityIcon activity={post.activity} size={13} /> {STORY_LABEL[post.activity]}
        </span>
        {post.from_gallery && (
          <span className="chip from-gallery">
            <Images size={13} aria-hidden /> Galeria
          </span>
        )}
        <span className="muted">{timeAgo(post.created_at)}</span>
        {post.user_id === currentUserId && (
          <button className="viewer-delete" onClick={() => setConfirming(true)} aria-label="Excluir esta prova">
            <Trash2 size={21} aria-hidden />
          </button>
        )}
        <button className="viewer-close" onClick={onClose} aria-label="Fechar">
          <X size={24} aria-hidden />
        </button>
      </div>

      <div className="viewer-photo">
        {url ? (
          <img key={post.id} src={url} alt={post.caption ?? `Prova de ${name}`} onLoad={() => setLoadedId(post.id)} />
        ) : (
          <SkeletonBlock width="100%" height="70%" radius={0} className="viewer-skeleton" />
        )}
      </div>

      <button className="tap left" onClick={prev} aria-label="Anterior" />
      <button className="tap right" onClick={next} aria-label="Próxima" />

      <div className="viewer-bottom">
        {post.caption && <p className="viewer-caption">{post.caption}</p>}
        <button className="comment-bar" onClick={() => setChatOpen(true)}>
          <MessageCircle size={18} aria-hidden />
          {counts[post.key]
            ? `${counts[post.key]} ${counts[post.key] === 1 ? 'comentário' : 'comentários'}`
            : 'Comentar…'}
        </button>
      </div>

      {confirming && (
        <div className="viewer-confirm" role="alertdialog" aria-label="Excluir prova">
          <p className="viewer-confirm-title">Excluir esta prova?</p>
          <p className="muted small">
            A foto e os comentários somem. Se era a única do dia, o dia deixa de contar na sequência e no ranking.
          </p>
          {deleteError && <p className="msg error">{deleteError}</p>}
          <div className="row">
            <button className="btn ghost" onClick={cancelDelete} disabled={deleting}>
              Cancelar
            </button>
            <button className="btn danger" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={16} aria-hidden /> {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      )}

      {chatOpen && (
        <StoryChat
          storyKey={post.key}
          ownerId={post.user_id}
          currentUserId={currentUserId}
          members={members}
          onClose={closeChat}
          onChanged={refreshCounts}
        />
      )}
    </div>
  )
}
