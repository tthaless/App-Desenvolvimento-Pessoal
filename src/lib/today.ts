import { useEffect, useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { errorMessage, todaySP } from './utils'
import type { Activity, StreakRow } from '../types'

/** O dia de hoje no grupo: quem já postou cada atividade e os streaks. */
export interface TodayState {
  loaded: boolean
  error: string | null
  day: string
  done: Record<Activity, Set<string>>
  streaks: StreakRow[]
}

const empty = (): TodayState => ({
  loaded: false,
  error: null,
  day: todaySP(),
  done: { exercicio: new Set(), leitura: new Set() },
  streaks: [],
})

let state = empty()
const listeners = new Set<() => void>()
let channel: RealtimeChannel | null = null
let pending: Promise<void> | null = null

function emit() {
  listeners.forEach((l) => l())
}

export function reloadToday(): Promise<void> {
  if (pending) return pending
  pending = (async () => {
    const day = todaySP()
    try {
      const [posts, streaks] = await Promise.all([
        supabase.from('posts').select('user_id,activity').eq('day', day),
        supabase.rpc('streaks'),
      ])
      const err = posts.error ?? streaks.error
      if (err) throw err
      const done: TodayState['done'] = { exercicio: new Set(), leitura: new Set() }
      for (const p of (posts.data ?? []) as { user_id: string; activity: Activity }[]) done[p.activity]?.add(p.user_id)
      state = { loaded: true, error: null, day, done, streaks: (streaks.data ?? []) as StreakRow[] }
    } catch (e) {
      state = { ...state, loaded: true, error: errorMessage(e) }
    }
    emit()
  })().finally(() => {
    pending = null
  })
  return pending
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!channel) {
    reloadToday()
    channel = supabase
      .channel('hoje')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => reloadToday())
      .subscribe()
  }
  return () => {
    listeners.delete(l)
    if (listeners.size === 0 && channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }
}

export function useToday(): TodayState {
  const s = useSyncExternalStore(subscribe, () => state)
  // Virou o dia com o app aberto: recarrega ao voltar pra ele.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === 'visible' && state.day !== todaySP()) reloadToday()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])
  return s
}

export function resetToday() {
  state = empty()
  emit()
}

/** Atalhos de leitura do estado. */
export function streakOf(s: TodayState, userId: string, activity: Activity) {
  return s.streaks.find((r) => r.user_id === userId && r.activity === activity)?.current_streak ?? 0
}
