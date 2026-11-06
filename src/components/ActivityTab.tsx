import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openProfile, refreshMembers, useMembers } from '../lib/members'
import { compressImage, errorMessage, todaySP } from '../lib/utils'
import { ACTIVITY } from '../types'
import type { Activity, StreakRow } from '../types'
import Avatar from './Avatar'
import Stories from './Stories'

interface Props {
  activity: Activity
  userId: string
}

export default function ActivityTab({ activity, userId }: Props) {
  const meta = ACTIVITY[activity]
  const members = useMembers()
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set())
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [today, s] = await Promise.all([
      supabase.from('posts').select('user_id').eq('activity', activity).eq('day', todaySP()),
      supabase.rpc('streaks'),
    ])
    const err = today.error ?? s.error
    if (err) return setLoadError(errorMessage(err))
    setLoadError(null)
    setDoneToday(new Set(((today.data ?? []) as { user_id: string }[]).map((r) => r.user_id)))
    setStreaks(((s.data ?? []) as StreakRow[]).filter((r) => r.activity === activity))
  }, [activity])

  useEffect(() => {
    load()
    refreshMembers().catch(() => {})
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

  const streakOf = (id: string) => streaks.find((r) => r.user_id === id)
  const me = members.find((m) => m.id === userId)
  const myStreak = streakOf(userId)
  const iDidToday = doneToday.has(userId)
  const current = myStreak?.current_streak ?? 0

  const board = [...members].sort(
    (a, b) =>
      (streakOf(b.id)?.current_streak ?? 0) - (streakOf(a.id)?.current_streak ?? 0) ||
      a.username.localeCompare(b.username),
  )

  const context = activity === 'leitura' ? me?.current_book : me?.exercises

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

      <Stories userId={userId} />

      <section className={`card hero ${iDidToday ? 'done' : ''}`}>
        <div className="hero-streak">
          <span className="flame" aria-hidden>🔥</span>
          <span className="big">{current}</span>
          <span className="unit">{current === 1 ? 'dia' : 'dias'}</span>
        </div>
        <p className="hero-sub">
          {iDidToday
            ? '✓ Feito hoje. Volte amanhã pra manter o streak.'
            : current > 0
              ? 'Ainda falta hoje! Poste antes da meia-noite.'
              : 'Comece seu streak hoje.'}
        </p>
        {myStreak && myStreak.best_streak > 0 && <p className="muted small hero-best">Recorde: {myStreak.best_streak} dias</p>}
        {context && (
          <p className="hero-context">
            {activity === 'leitura' ? '📖 Lendo: ' : '🏋️ '}
            <strong>{context}</strong>
          </p>
        )}
        <button className={`btn ${iDidToday ? 'ghost' : 'primary'} big-btn`} onClick={() => inputRef.current?.click()}>
          📸 {iDidToday ? 'Postar outra foto' : meta.verb}
        </button>
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
            const done = doneToday.has(m.id)
            return (
              <li key={m.id} className={m.id === userId ? 'me' : ''}>
                <button className="person" onClick={() => openProfile(m.id)}>
                  <span className="avatar-wrap">
                    <Avatar name={m.username} url={m.avatar_url} size="sm" />
                    {done && <span className="done-dot" aria-label="fez hoje">✓</span>}
                  </span>
                  <span className="name">{m.username}</span>
                </button>
                <span className="streak-pill">🔥 {streakOf(m.id)?.current_streak ?? 0}</span>
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
              placeholder={
                activity === 'leitura'
                  ? me?.current_book
                    ? `Quantas páginas de ${me.current_book}? (opcional)`
                    : 'O que está lendo? (opcional)'
                  : 'Qual foi o treino? (opcional)'
              }
              maxLength={140}
            />
            {iDidToday && <p className="muted small">Você já postou hoje, então essa foto não soma pontos, mas aparece nos stories.</p>}
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
    </div>
  )
}
