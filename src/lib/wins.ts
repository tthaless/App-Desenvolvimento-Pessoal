import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Quantas semanas cada pessoa terminou em 1º no ranking (calculado no banco).
let cache: { at: number; data: Record<string, number> } | null = null
let inflight: Promise<Record<string, number> | null> | null = null

async function fetchWins(): Promise<Record<string, number> | null> {
  const { data, error } = await supabase.rpc('weekly_wins')
  if (error) return null // banco ainda sem a função: não mostra nada
  return Object.fromEntries(((data ?? []) as { user_id: string; wins: number }[]).map((r) => [r.user_id, r.wins]))
}

/** null = ainda carregando ou indisponível. */
export function useWeeklyWins(userId: string): number | null {
  const [wins, setWins] = useState<number | null>(cache ? (cache.data[userId] ?? 0) : null)
  useEffect(() => {
    let active = true
    if (cache && Date.now() - cache.at < 10 * 60 * 1000) {
      setWins(cache.data[userId] ?? 0)
      return
    }
    inflight ??= fetchWins().finally(() => {
      inflight = null
    })
    inflight.then((data) => {
      if (data) cache = { at: Date.now(), data }
      if (active) setWins(data ? (data[userId] ?? 0) : null)
    })
    return () => {
      active = false
    }
  }, [userId])
  return wins
}
