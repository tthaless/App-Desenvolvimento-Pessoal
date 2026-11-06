import { useCallback, useEffect, useRef, useState } from 'react'
import { LONG_CACHE } from '../lib/signed'
import { supabase } from '../lib/supabase'
import { openProfile, refreshMembers, useMembers } from '../lib/members'
import { compressImage, errorMessage, todaySP } from '../lib/utils'
import { ACTIVITY } from '../types'
import type { Activity, StreakRow } from '../types'
import Avatar from './Avatar'
import Stories from './Stories'
import { Camera, Check } from 'lucide-react'
import ActivityIcon from './ActivityIcon'
import { FlameMark } from './Logo'
import TopBar from './TopBar'
import PushOffer from './PushOffer'
import { useDragToClose } from '../lib/useDragToClose'
import Celebration from './Celebration'
import { SkeletonCard, SkeletonRows } from './Skeleton'

interface Props {
  activity: Activity
  userId: string
  /** Na aba Leitura o título fica acima das subabas. */
  hideHeader?: boolean
}

export default function ActivityTab({ activity, userId, hideHeader }: Props) {
  const meta = ACTIVITY[activity]
  const members = useMembers()
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set())
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [celebrate, setCelebrate] = useState<{ from: number; to: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useDragToClose<HTMLDivElement>(() => !sending && closeDraft(), !!draft)
  const endCelebration = useCallback(() => setCelebrate(null), [])
  // Depois de postar, convida (uma vez) pra ligar as notificações no celular.
  const [posted, setPosted] = useState(false)

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
    setLoaded(true)
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
  // 0 = domingo ... 6 = sábado, no fuso de São Paulo.
  const weekday = new Date(`${todaySP()}T12:00:00`).getDay()
  const weekend = weekday === 0 || weekday === 6
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
      const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg', ...LONG_CACHE })
      if (up.error) throw up.error
      const ins = await supabase.from('posts').insert({ activity, photo_path: path, caption: caption.trim() || null })
      if (ins.error) {
        await supabase.storage.from('provas').remove([path])
        throw ins.error
      }
      const firstToday = !iDidToday
      const before = current
      closeDraft()
      setPosted(true)
      if (firstToday) setCelebrate({ from: before, to: before + 1 })
      await load()
    } catch (e) {
      setSendError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`activity act-${activity}`}>
      {!hideHeader && <TopBar />}

      {loadError && <p className="msg error">{loadError}</p>}

      <Stories userId={userId} />

      <PushOffer show={posted && !celebrate} />

      {!loaded ? (
        <SkeletonCard height={230} />
      ) : (
      <section className={`card hero ${iDidToday ? 'done' : ''}`}>
        <div className="hero-streak">
          <FlameMark size={40} className="flame" />
          <span className="big">{current}</span>
          <span className="unit">{current === 1 ? 'dia' : 'dias'}</span>
        </div>
        <p className="hero-sub">
          {weekend
            ? iDidToday
              ? 'Feito! No fim de semana é bônus: soma pontos e dias.'
              : 'Fim de semana: postar soma pontos e dias, faltar não quebra o streak.'
            : iDidToday
              ? weekday === 5
                ? 'Feito hoje. O fim de semana é livre: faltar não quebra o streak.'
                : 'Feito hoje. Volte amanhã pra manter o streak.'
              : current > 0
                ? 'Ainda falta hoje! Poste antes da meia-noite.'
                : 'Comece seu streak hoje.'}
        </p>
        {myStreak && myStreak.best_streak > 0 && <p className="muted small hero-best">Recorde: {myStreak.best_streak} dias</p>}
        {context ? (
          <p className="hero-context">
            <ActivityIcon activity={activity} size={16} />
            {activity === 'leitura' && 'Lendo '}
            <strong>{context}</strong>
          </p>
        ) : (
          activity === 'leitura' && <p className="hero-context">
              <ActivityIcon activity="leitura" size={16} />
              Cadastre o livro que está lendo na Biblioteca.
            </p>
        )}
        <button className={`btn ${iDidToday ? 'ghost' : 'primary'} big-btn`} onClick={() => inputRef.current?.click()}>
          <Camera size={20} aria-hidden /> {iDidToday ? 'Postar outra foto' : meta.verb}
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
      )}

      <section className="section">
        <h2 className="section-label">Hoje no grupo</h2>
        {members.length === 0 && <SkeletonRows count={4} />}
        <ul className="board">
          {board.map((m) => {
            const done = doneToday.has(m.id)
            return (
              <li key={m.id} className={m.id === userId ? 'me' : ''}>
                <button className="person" onClick={() => openProfile(m.id)}>
                  <span className="avatar-wrap">
                    <Avatar name={m.username} url={m.avatar_url} size="sm" />
                    {done && (
                      <span className="done-dot" aria-label="fez hoje">
                        <Check size={11} strokeWidth={3.5} />
                      </span>
                    )}
                  </span>
                  <span className="name">{m.username}</span>
                </button>
                <span className="streak-pill">
                  <FlameMark size={14} /> {streakOf(m.id)?.current_streak ?? 0}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {draft && (
        <div className="sheet-backdrop" onClick={() => !sending && closeDraft()}>
          <div className="sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grip" aria-hidden />
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

      {celebrate && (
        <Celebration
          from={celebrate.from}
          to={celebrate.to}
          unit={celebrate.to === 1 ? 'dia seguido' : 'dias seguidos'}
          title={activity === 'leitura' ? 'Leitura do dia feita!' : 'Treino do dia feito!'}
          onDone={endCelebration}
        />
      )}
    </div>
  )
}
