import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type NotificationKind =
  | 'story_comment'
  | 'story_reply'
  | 'feed_comment'
  | 'feed_reply'
  | 'book_like'
  | 'want_too'
  | 'challenge_vote'
  | 'last_one'

export interface AppNotification {
  id: string
  actor_id: string
  kind: NotificationKind
  story_key: string | null
  feed_post_id: string | null
  book_id: string | null
  idea_id?: string | null
  detail: string | null
  preview: string | null
  expires_at: string | null
  created_at: string
  read_at: string | null
}

/** Para onde o app vai quando a pessoa toca num aviso. */
export type NavTarget =
  | { type: 'story'; key: string }
  | { type: 'feed'; postId: string }
  | { type: 'library' }
  | { type: 'tab'; tab: 'exercicio' | 'leitura' | 'desafio' }

interface State {
  items: AppNotification[]
  loaded: boolean
  open: boolean
  target: NavTarget | null
}

let state: State = { items: [], loaded: false, open: false, target: null }
const listeners = new Set<() => void>()
let currentUser: string | null = null
let channel: RealtimeChannel | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let tick: ReturnType<typeof setInterval> | undefined

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

async function load() {
  if (!currentUser) return
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60)
  // Antes do banco ter a tabela, simplesmente não mostra nada.
  set({ items: error ? [] : ((data ?? []) as AppNotification[]), loaded: true })
}

function reloadSoon() {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
}

/** Começa a acompanhar os avisos de quem entrou. */
export function startNotifications(userId: string) {
  if (currentUser === userId) return
  stopNotifications()
  currentUser = userId
  load()
  channel = supabase
    .channel(`avisos-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, reloadSoon)
    .subscribe()
  tick = setInterval(load, 5 * 60 * 1000)
}

export function stopNotifications() {
  if (channel) supabase.removeChannel(channel)
  channel = null
  clearTimeout(timer)
  clearInterval(tick)
  currentUser = null
  set({ items: [], loaded: false, open: false, target: null })
}

export function useNotificationState(): State {
  return useSyncExternalStore(subscribe, () => state)
}

export function unreadCount(items: AppNotification[]) {
  return items.filter((n) => !n.read_at).length
}

export function openNotifications() {
  set({ open: true })
  load()
}

export function closeNotifications() {
  set({ open: false })
}

/** Marca tudo como lido (a lista aberta continua destacando o que era novo). */
export async function markAllRead() {
  if (!state.items.some((n) => !n.read_at)) return
  const now = new Date().toISOString()
  set({ items: state.items.map((n) => (n.read_at ? n : { ...n, read_at: now })) })
  await supabase.from('notifications').update({ read_at: now }).is('read_at', null)
}

export async function clearNotifications() {
  const ids = state.items.map((n) => n.id)
  set({ items: [] })
  if (ids.length) await supabase.from('notifications').delete().in('id', ids)
}

export function goTo(target: NavTarget) {
  set({ target, open: false })
}

export function clearNavTarget() {
  if (state.target) set({ target: null })
}

export function useNavTarget(): NavTarget | null {
  return useSyncExternalStore(subscribe, () => state.target)
}

/** Story ou post que já sumiu não abre mais. */
export function isExpired(n: AppNotification) {
  return !!n.expires_at && new Date(n.expires_at).getTime() < Date.now()
}

export function targetOf(n: AppNotification): NavTarget | null {
  if ((n.kind === 'story_comment' || n.kind === 'story_reply') && n.story_key) return { type: 'story', key: n.story_key }
  if ((n.kind === 'feed_comment' || n.kind === 'feed_reply') && n.feed_post_id) return { type: 'feed', postId: n.feed_post_id }
  if (n.kind === 'book_like' || n.kind === 'want_too') return { type: 'library' }
  if (n.kind === 'challenge_vote') return { type: 'tab', tab: 'desafio' }
  if (n.kind === 'last_one') return { type: 'tab', tab: n.detail === 'leitura' ? 'leitura' : 'exercicio' }
  return null
}
