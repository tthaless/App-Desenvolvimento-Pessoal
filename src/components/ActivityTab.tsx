import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage, errorMessage, loadSeen, saveSeen, todaySP } from '../lib/utils'
import { ACTIVITY } from '../types'
import type { Activity, Post, StreakRow } from '../types'
import StoryViewer from './StoryViewer'

interface Props {
  activity: Activity
  userId: string
}

interface Member {
  id: string
  username: string
}

export default function ActivityTab({ activity, userId }: Props) {
  const meta = ACTIVITY[activity]
  const [posts, setPosts] = useState<Post[]>([])
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewerStart, setViewerStart] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<string>>(loadSeen)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [p, s, m] = await Promise.all([
      supabase
        .from('posts')
        .select('id,user_id,activity,photo_path,caption,created_at,day,profiles(username)')
        .eq('activity', activity)
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      supabase.rpc('streaks'),
      supabase.from('profiles').select('id,username').order('username'),
    ])
    const err = p.error ?? s.error ?? m.error
    if (err) {
      setLoadError(errorMessage(err))
    } else {
      setLoadError(null)
      setPosts((p.data ?? []) as unknown as Post[])
      setStreaks(((s.data ?? []) as StreakRow[]).filter((r) => r.activity === activity))
      setMembers((m.data ?? []) as Member[])
    }
    setLoaded(true)
  }, [activity])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`posts-${activity}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `activity=eq.${activity}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [activity, load])

  // Stories: os meus primeiro, depois quem postou mais recente.
  const stories = useMemo(() => {
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
      return { userId: g[0].user_id, username: g[0].profiles?.username ?? '?', start, ids: g.map((p) => p.id) }
    })
    return { flat: groups.flat(), circles }
  }, [posts, userId])

  const today = todaySP()
  const doneToday = new Set(posts.filter((p) => p.day === today).map((p) => p.user_id))
  const iDidToday = doneToday.has(userId)
  const streakOf = (id: string) => streaks.find((r) => r.user_id === id)
  const myStreak = streakOf(userId)

  const board = [...members].sort(
    (a, b) => (streakOf(b.id)?.current_streak ?? 0) - (streakOf(a.id)?.current_streak ?? 0) || a.username.localeCompare(b.username),
  )

  function markSeen(id: string) {
    setSeen((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      saveSeen(next)
      return next
    })
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return
    setSendError(null)
    setCaption('')
    setDraft({ file, url: URL.createObjectURL(file) })
  }

  function closeDraft() {
    if (draft) URL.revokeObjectURL(draft.url)
    setDraft(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function send() {
    if (!draft) return
    setSending(true)
    setSendError(null)
    const path = `${userId}/${activity}-${Date.now()}.jpg`
    try {
      const blob = await compressImage(draft.file)
      const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const ins = await supabase.from('posts').insert({ activity, photo_path: path, caption: caption.trim() || null })
      if (ins.error) {
        await supabase.storage.from('provas').remove([path])
        throw ins.error
      }
      closeDraft()
      await load()
    } catch (e) {
      setSendError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`activity act-${activity}`}>
      <header className="page-head">
        <h1>
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </h1>
      </header>

      {loadError && <p className="msg error">{loadError}</p>}

      <section className="stories" aria-label="Stories das últimas 24 horas">
        {stories.circles.length === 0 && loaded && <p className="muted small">Ninguém postou nas últimas 24h. Seja o primeiro.</p>}
        {stories.circles.map((c) => (
          <button key={c.userId} className={`story ${c.ids.some((id) => !seen.has(id)) ? 'unseen' : ''}`} onClick={() => setViewerStart(c.start)}>
            <span className="avatar">{c.username.slice(0, 1).toUpperCase()}</span>
            <span className="story-name">{c.userId === userId ? 'Você' : c.username}</span>
          </button>
        ))}
      </section>

      <section className={`card hero ${iDidToday ? 'done' : ''}`}>
        <div className="hero-streak">
          <span className="flame" aria-hidden>🔥</span>
          <span className="big">{myStreak?.current_streak ?? 0}</span>
          <span className="unit">{(myStreak?.current_streak ?? 0) === 1 ? 'dia' : 'dias'}</span>
        </div>
        <p className="hero-sub">
          {iDidToday
            ? 'Feito hoje. Volte amanhã pra manter o streak.'
            : (myStreak?.current_streak ?? 0) > 0
              ? 'Ainda falta hoje! Poste antes da meia-noite.'
              : 'Comece seu streak hoje.'}
        </p>
        {myStreak && myStreak.best_streak > 0 && <p className="muted small hero-best">Recorde: {myStreak.best_streak} dias</p>}
        {!iDidToday && (
          <button className="btn primary big-btn" onClick={() => inputRef.current?.click()}>
            📸 {meta.verb}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
      </section>

      <section className="card">
        <h2>Hoje no grupo</h2>
        <ul className="board">
          {board.map((m) => {
            const s = streakOf(m.id)
            const done = doneToday.has(m.id)
            return (
              <li key={m.id} className={m.id === userId ? 'me' : ''}>
                <span className={`check ${done ? 'yes' : ''}`} aria-label={done ? 'fez hoje' : 'pendente'}>
                  {done ? '✓' : ''}
                </span>
                <span className="name">{m.username}</span>
                <span className="streak-pill">🔥 {s?.current_streak ?? 0}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {draft && (
        <div className="sheet-backdrop" onClick={() => !sending && closeDraft()}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <img src={draft.url} alt="Prévia da foto" className="preview" />
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={activity === 'leitura' ? 'O que está lendo? (opcional)' : 'Qual foi o treino? (opcional)'}
              maxLength={140}
            />
            {sendError && <p className="msg error">{sendError}</p>}
            <div className="row">
              <button className="btn ghost" onClick={closeDraft} disabled={sending}>
                Cancelar
              </button>
              <button className="btn primary" onClick={send} disabled={sending}>
                {sending ? 'Enviando…' : 'Postar prova'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerStart !== null && stories.flat.length > 0 && (
        <StoryViewer
          posts={stories.flat}
          start={viewerStart}
          currentUserId={userId}
          onSeen={markSeen}
          onClose={() => setViewerStart(null)}
        />
      )}
    </div>
  )
}
