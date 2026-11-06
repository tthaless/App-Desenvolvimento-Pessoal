import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { openProfile, useMembers } from '../lib/members'
import {
  WEEKDAY_INITIALS,
  addDays,
  challengePoints,
  checkin,
  deleteIdea,
  fetchActive,
  fetchCheckins,
  fetchIdeas,
  nextWeek,
  proposeIdea,
  removeVote,
  shortDate,
  vote,
  weekDays,
} from '../lib/challenges'
import type { Challenge, Checkin, Idea } from '../lib/challenges'
import { errorMessage, todaySP } from '../lib/utils'
import Avatar from './Avatar'
import { Camera, Check, Crown, Plus, Target } from 'lucide-react'
import TopBar from './TopBar'

export default function Challenges({ userId }: { userId: string }) {
  const [view, setView] = useState<'semana' | 'votacao'>('semana')

  return (
    <div className="challenges">
      <TopBar title="Desafio" />
      <div className="segmented">
        <button className={view === 'semana' ? 'on' : ''} onClick={() => setView('semana')}>
          Desta semana
        </button>
        <button className={view === 'votacao' ? 'on' : ''} onClick={() => setView('votacao')}>
          Votação
        </button>
      </div>
      {view === 'semana' ? <ThisWeek userId={userId} onGoVote={() => setView('votacao')} /> : <Voting userId={userId} />}
    </div>
  )
}

// ---------------- Desafio da semana ----------------

function ThisWeek({ userId, onGoVote }: { userId: string; onGoVote: () => void }) {
  const members = useMembers()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const active = await fetchActive()
      setChallenge(active)
      setCheckins(active ? await fetchCheckins(active.id) : [])
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('desafio-semana')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_checkins' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  function closeDraft() {
    if (draft) URL.revokeObjectURL(draft.url)
    setDraft(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function send() {
    if (!draft || !challenge) return
    setSending(true)
    setError(null)
    try {
      await checkin(userId, challenge.id, draft.file)
      closeDraft()
      await load()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  if (!loaded) return null

  if (!challenge) {
    return (
      <section className="card empty-challenge">
        <span className="empty-icon" aria-hidden>
          <Target size={34} strokeWidth={1.6} />
        </span>
        <p className="book-title">Sem desafio esta semana</p>
        <p className="muted small">Ninguém propôs um desafio na semana passada. Proponha um agora pra semana que vem.</p>
        <button className="btn primary" onClick={onGoVote}>
          Ir pra votação
        </button>
      </section>
    )
  }

  const today = todaySP()
  const days = weekDays(challenge.week)
  const daysOf = (id: string) => new Set(checkins.filter((c) => c.user_id === id).map((c) => c.day))
  const mine = daysOf(userId)
  const doneToday = mine.has(today)
  const daysLeft = days.filter((d) => d >= today).length - (doneToday ? 1 : 0)
  const proposer = members.find((m) => m.id === challenge.user_id)

  let status: string
  if (mine.size >= 7) status = '7 de 7! +40 pontos garantidos'
  else if (mine.size >= 5) status = `${mine.size} de 7 · +30 pontos garantidos. Faça os 7 pra ganhar 40.`
  else if (mine.size + daysLeft >= 5) status = `${mine.size} de 7 · faltam ${5 - mine.size} ${5 - mine.size === 1 ? 'dia' : 'dias'} pros 30 pontos`
  else status = `${mine.size} de 7 · não dá mais pra chegar a 5 dias nesta semana`

  const board = [...members].sort((a, b) => daysOf(b.id).size - daysOf(a.id).size || a.username.localeCompare(b.username))

  return (
    <>
      <section className="card challenge-hero">
        <p className="muted small">
          Semana de {shortDate(challenge.week)} a {shortDate(addDays(challenge.week, 6))}
        </p>
        <p className="challenge-title">{challenge.title}</p>
        {challenge.description && <p className="challenge-desc">{challenge.description}</p>}
        <button className="by" onClick={() => openProfile(challenge.user_id)}>
          <Avatar name={proposer?.username ?? '?'} url={proposer?.avatar_url} size="sm" />
          <span className="muted small">
            ideia de {proposer?.username ?? '?'} · {challenge.votes} {challenge.votes === 1 ? 'voto' : 'votos'}
          </span>
        </button>

        <div className="week-dots" aria-label="Seus dias cumpridos">
          {days.map((d, i) => (
            <span key={d} className={`dot ${mine.has(d) ? 'on' : ''} ${d === today ? 'today' : ''} ${d > today ? 'future' : ''}`}>
              <span className="dot-day">{WEEKDAY_INITIALS[i]}</span>
              <span className="dot-mark">{mine.has(d) && <Check size={16} strokeWidth={3} />}</span>
            </span>
          ))}
        </div>
        <p className="challenge-status">{status}</p>

        {error && <p className="msg error">{error}</p>}
        {doneToday ? (
          <p className="msg ok">
            <Check size={16} strokeWidth={3} aria-hidden /> Cumprido hoje. Volte amanhã!
          </p>
        ) : (
          <button className="btn primary big-btn" onClick={() => inputRef.current?.click()}>
            <Camera size={20} aria-hidden /> Cumpri hoje
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setDraft({ file: f, url: URL.createObjectURL(f) })
        }} />
      </section>

      <section className="section">
        <h2 className="section-label">Como está o grupo</h2>
        <ul className="board">
          {board.map((m) => {
            const n = daysOf(m.id).size
            const pts = challengePoints(n)
            return (
              <li key={m.id} className={m.id === userId ? 'me' : ''}>
                <button className="person" onClick={() => openProfile(m.id)}>
                  <span className="avatar-wrap">
                    <Avatar name={m.username} url={m.avatar_url} size="sm" />
                    {daysOf(m.id).has(today) && (
                      <span className="done-dot" aria-label="cumpriu hoje">
                        <Check size={11} strokeWidth={3.5} />
                      </span>
                    )}
                  </span>
                  <span className="name">{m.username}</span>
                </button>
                {pts > 0 && <span className="pts-badge">+{pts}</span>}
                <span className="streak-pill">{n}/7</span>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="muted small rules">5 de 7 dias: +30 pontos · 7 de 7: +40</p>

      {draft && (
        <div className="sheet-backdrop" onClick={() => !sending && closeDraft()}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <img src={draft.url} alt="Prévia da foto" className="preview" />
            <p className="muted small center">{challenge.title}</p>
            <div className="row">
              <button className="btn ghost" onClick={closeDraft} disabled={sending}>
                Cancelar
              </button>
              <button className="btn primary" onClick={send} disabled={sending}>
                {sending ? 'Enviando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------- Votação da próxima semana ----------------

function Voting({ userId }: { userId: string }) {
  const members = useMembers()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposing, setProposing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const week = nextWeek()

  const load = useCallback(async () => {
    try {
      setIdeas(await fetchIdeas(week))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
    setLoaded(true)
  }, [week])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('desafio-votacao')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_ideas' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_votes' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  async function act(fn: () => Promise<void>) {
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function propose(e: FormEvent) {
    e.preventDefault()
    if (title.trim().length < 3) return setError('O desafio precisa de um título com pelo menos 3 letras.')
    setBusy(true)
    await act(() => proposeIdea(title, description))
    setBusy(false)
    setTitle('')
    setDescription('')
    setProposing(false)
  }

  const myVote = ideas.find((i) => i.voters.includes(userId))?.id

  return (
    <>
      <section className="card vote-info">
        <p className="book-title">
          Semana de {shortDate(week)} a {shortDate(addDays(week, 6))}
        </p>
        <p className="muted small">
          A votação fecha no domingo às 23:59. O mais votado vira o desafio da semana; no empate, ganha quem propôs primeiro.
        </p>
      </section>

      {error && <p className="msg error">{error}</p>}

      {proposing ? (
        <form className="card edit-form" onSubmit={propose}>
          <label>
            Desafio
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="ex: 100 flexões por dia" autoFocus required />
          </label>
          <label>
            Regras ou detalhes (opcional)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} rows={3} placeholder="Como provar, o que vale, etc." />
          </label>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setProposing(false)} disabled={busy}>
              Cancelar
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Enviando…' : 'Propor'}
            </button>
          </div>
        </form>
      ) : (
        <button className="btn primary full" onClick={() => setProposing(true)}>
          <Plus size={18} aria-hidden /> Propor um desafio
        </button>
      )}

      {loaded && ideas.length === 0 && <p className="muted small center empty">Nenhuma ideia ainda. Se ninguém propor, a semana fica sem desafio.</p>}

      <ol className="ideas">
        {ideas.map((idea, i) => {
          const author = members.find((m) => m.id === idea.user_id)
          const own = idea.user_id === userId
          const voted = myVote === idea.id
          return (
            <li key={idea.id} className={`card idea ${i === 0 && idea.voters.length > 0 ? 'leading' : ''}`}>
              <div className="idea-top">
                <span className="idea-pos">{i === 0 && idea.voters.length > 0 ? <Crown size={18} className="crown" aria-label="liderando" /> : i + 1}</span>
                <div className="idea-main">
                  <p className="idea-title">{idea.title}</p>
                  {idea.description && <p className="idea-desc">{idea.description}</p>}
                  <button className="by" onClick={() => openProfile(idea.user_id)}>
                    <Avatar name={author?.username ?? '?'} url={author?.avatar_url} size="sm" />
                    <span className="muted small">{own ? 'sua ideia' : author?.username}</span>
                  </button>
                </div>
              </div>
              <div className="idea-bottom">
                <span className="voters">
                  {idea.voters.slice(0, 5).map((v) => {
                    const m = members.find((x) => x.id === v)
                    return <Avatar key={v} name={m?.username ?? '?'} url={m?.avatar_url} size="sm" className="stacked" />
                  })}
                  <span className="muted small">
                    {idea.voters.length} {idea.voters.length === 1 ? 'voto' : 'votos'}
                  </span>
                </span>
                {own ? (
                  <button className="btn ghost small-btn" onClick={() => confirm('Apagar sua ideia?') && act(() => deleteIdea(idea.id))}>
                    Apagar
                  </button>
                ) : voted ? (
                  <button className="btn primary small-btn" onClick={() => act(() => removeVote(userId))}>
                    <Check size={14} strokeWidth={3} aria-hidden /> Seu voto
                  </button>
                ) : (
                  <button className="btn ghost small-btn" onClick={() => act(() => vote(idea.id))}>
                    Votar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
