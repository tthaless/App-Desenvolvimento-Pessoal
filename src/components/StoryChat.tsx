import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { addStoryComment, deleteStoryComment, fetchStoryComments } from '../lib/storyComments'
import type { StoryComment } from '../lib/storyComments'
import { errorMessage, timeAgo } from '../lib/utils'
import type { Member } from '../types'
import Avatar from './Avatar'
import { Trash2, X } from 'lucide-react'
import { useDragToClose } from '../lib/useDragToClose'
import { SkeletonRows } from './Skeleton'

interface Props {
  storyKey: string
  ownerId: string
  currentUserId: string
  members: Member[]
  onClose: () => void
  onChanged: () => void
}

/** Comentários de uma prova, abertos por cima do story (que fica pausado). */
export default function StoryChat({ storyKey, ownerId, currentUserId, members, onClose, onChanged }: Props) {
  const [comments, setComments] = useState<StoryComment[]>([])
  const [loaded, setLoaded] = useState(false)
  const sheetRef = useDragToClose<HTMLDivElement>(onClose)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setComments(await fetchStoryComments(storyKey))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [storyKey])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`story-chat-${storyKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_comments', filter: `story_key=eq.${storyKey}` }, () => {
        load()
        onChanged()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [storyKey, load, onChanged])

  // Rola pro comentário mais novo.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [comments.length])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    setError(null)
    try {
      await addStoryComment(storyKey, text)
      setBody('')
      await load()
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  async function remove(c: StoryComment) {
    if (!confirm('Apagar este comentário?')) return
    try {
      await deleteStoryComment(c.id)
      await load()
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="story-chat-backdrop" onClick={onClose}>
      <div className="story-chat" ref={sheetRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Comentários da prova">
        <div className="story-chat-head">
          <span className="sheet-grip" aria-hidden />
          <strong>Comentários</strong>
          <button className="viewer-close" onClick={onClose} aria-label="Fechar comentários">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="story-chat-list" ref={listRef}>
          {!loaded && <SkeletonRows count={2} />}
          {loaded && comments.length === 0 && <p className="muted small center empty">Ninguém comentou ainda. Começa a zoeira.</p>}
          {comments.map((c) => {
            const m = members.find((x) => x.id === c.user_id)
            const canDelete = c.user_id === currentUserId || ownerId === currentUserId
            return (
              <div key={c.id} className="chat-msg">
                <Avatar name={m?.username ?? '?'} url={m?.avatar_url} size="sm" />
                <div className="chat-main">
                  <p className="chat-line">
                    <strong>{c.user_id === currentUserId ? 'Você' : (m?.username ?? '?')}</strong>
                    <span className="muted"> · {timeAgo(c.created_at)}</span>
                  </p>
                  <p className="chat-body">{c.body}</p>
                </div>
                {canDelete && (
                  <button className="chat-delete" onClick={() => remove(c)} aria-label="Apagar comentário">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="msg error">{error}</p>}
        <form className="story-chat-input" onSubmit={send}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comentar…" maxLength={280} autoFocus />
          <button className="btn primary small-btn" disabled={sending || !body.trim()}>
            {sending ? '…' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  )
}
