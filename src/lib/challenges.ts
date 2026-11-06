import { supabase } from './supabase'
import { compressImage, todaySP } from './utils'

export interface Challenge {
  id: string
  user_id: string
  title: string
  description: string | null
  week: string
  votes: number
}

export interface Idea {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  voters: string[]
}

export interface Checkin {
  user_id: string
  day: string
}

// ---------- Datas (AAAA-MM-DD, fuso de São Paulo) ----------

function parse(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

function format(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: string, n: number) {
  const x = parse(d)
  x.setUTCDate(x.getUTCDate() + n)
  return format(x)
}

/** Segunda-feira da semana de `d`. */
export function weekStart(d: string = todaySP()) {
  const x = parse(d)
  return addDays(d, -((x.getUTCDay() + 6) % 7))
}

export function nextWeek() {
  return addDays(weekStart(), 7)
}

export function weekDays(week: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(week, i))
}

/** "09/11" */
export function shortDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export const WEEKDAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

// ---------- Consultas ----------

export async function fetchActive(): Promise<Challenge | null> {
  const { data, error } = await supabase.rpc('active_challenge')
  if (error) throw error
  return ((data ?? []) as Challenge[])[0] ?? null
}

export async function fetchCheckins(ideaId: string): Promise<Checkin[]> {
  const { data, error } = await supabase.from('challenge_checkins').select('user_id,day').eq('idea_id', ideaId)
  if (error) throw error
  return (data ?? []) as Checkin[]
}

export async function fetchIdeas(week: string): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('challenge_ideas')
    .select('id,user_id,title,description,created_at,challenge_votes(user_id)')
    .eq('week', week)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .map((row) => {
      const r = row as unknown as Omit<Idea, 'voters'> & { challenge_votes: { user_id: string }[] }
      return { id: r.id, user_id: r.user_id, title: r.title, description: r.description, created_at: r.created_at, voters: r.challenge_votes.map((v) => v.user_id) }
    })
    // Mais votada primeiro; no empate, quem propôs antes.
    .sort((a, b) => b.voters.length - a.voters.length || a.created_at.localeCompare(b.created_at))
}

export async function proposeIdea(title: string, description: string) {
  const { error } = await supabase.from('challenge_ideas').insert({ title: title.trim(), description: description.trim() || null })
  if (error) throw error
}

export async function deleteIdea(id: string) {
  const { error } = await supabase.from('challenge_ideas').delete().eq('id', id)
  if (error) throw error
}

export async function vote(ideaId: string) {
  const { error } = await supabase.rpc('vote_challenge', { idea: ideaId })
  if (error) throw error
}

export async function removeVote(userId: string) {
  const { error } = await supabase.from('challenge_votes').delete().eq('user_id', userId).eq('week', nextWeek())
  if (error) throw error
}

export async function checkin(userId: string, ideaId: string, file: File) {
  const path = `${userId}/desafio-${Date.now()}.jpg`
  const blob = await compressImage(file)
  const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await supabase.from('challenge_checkins').insert({ idea_id: ideaId, photo_path: path })
  if (error) {
    await supabase.storage.from('provas').remove([path])
    throw error
  }
}

/** Pontos do desafio pela quantidade de dias cumpridos na semana. */
export function challengePoints(days: number) {
  return days >= 7 ? 40 : days >= 5 ? 30 : 0
}
