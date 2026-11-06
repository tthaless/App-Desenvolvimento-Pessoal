import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Member } from '../types'

// Lista de membros do grupo compartilhada entre as telas,
// com links temporários das fotos de perfil (o bucket é privado).

let cache: Member[] | null = null
let inflight: Promise<Member[]> | null = null
const listeners = new Set<(members: Member[]) => void>()

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,avatar_path,bio,current_book,exercises')
    .order('username')
  if (error) throw error
  const rows = (data ?? []) as Omit<Member, 'avatar_url'>[]
  const paths = rows.map((r) => r.avatar_path).filter((p): p is string => !!p)
  const urls: Record<string, string> = {}
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('provas').createSignedUrls(paths, 60 * 60 * 24)
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl
    })
  }
  return rows.map((r) => ({ ...r, avatar_url: r.avatar_path ? (urls[r.avatar_path] ?? null) : null }))
}

export function refreshMembers(): Promise<Member[]> {
  if (inflight) return inflight
  inflight = fetchMembers()
    .then((members) => {
      cache = members
      listeners.forEach((l) => l(members))
      return members
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useMembers(): Member[] {
  const [members, setMembers] = useState<Member[]>(cache ?? [])
  useEffect(() => {
    listeners.add(setMembers)
    if (!cache) refreshMembers().catch(() => {})
    return () => {
      listeners.delete(setMembers)
    }
  }, [])
  return members
}

export function clearMembers() {
  cache = null
}

// Abrir o perfil de alguém de qualquer tela.
const profileListeners = new Set<(id: string | null) => void>()

export function openProfile(id: string) {
  profileListeners.forEach((l) => l(id))
}

export function useOpenProfile(): [string | null, () => void] {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    profileListeners.add(setId)
    return () => {
      profileListeners.delete(setId)
    }
  }, [])
  const close = useCallback(() => setId(null), [])
  return [id, close]
}
