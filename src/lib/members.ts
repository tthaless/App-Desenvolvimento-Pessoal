import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { signPaths } from './signed'
import type { Member } from '../types'

// Lista de membros do grupo compartilhada entre as telas,
// com links temporários das fotos de perfil (o bucket é privado).

let cache: Member[] | null = null
let inflight: Promise<Member[]> | null = null
const listeners = new Set<(members: Member[]) => void>()

async function fetchMembers(): Promise<Member[]> {
  const [first, reading] = await Promise.all([
    supabase.from('profiles').select('id,username,avatar_path,cover_path,bio,exercises').order('username'),
    supabase.from('books').select('user_id,title').is('finished_at', null).is('abandoned_at', null),
  ])
  // Banco ainda sem a coluna do plano de fundo: busca sem ela.
  const profiles = first.error && /cover_path/.test(first.error.message)
    ? await supabase.from('profiles').select('id,username,avatar_path,bio,exercises').order('username')
    : first
  if (profiles.error) throw profiles.error
  const books = new Map(((reading.data ?? []) as { user_id: string; title: string }[]).map((b) => [b.user_id, b.title]))
  const rows = ((profiles.data ?? []) as Omit<Member, 'avatar_url' | 'cover_url' | 'current_book'>[]).map((r) => ({
    ...r,
    cover_path: r.cover_path ?? null,
    current_book: books.get(r.id) ?? null,
  }))
  const paths = rows.flatMap((r) => [r.avatar_path, r.cover_path]).filter((p): p is string => !!p)
  // Link de 7 dias, reaproveitado: a foto de perfil não é baixada de novo a cada abertura.
  const urls = paths.length ? await signPaths(paths, 7 * 24 * 60 * 60) : {}
  return rows.map((r) => ({
    ...r,
    avatar_url: r.avatar_path ? (urls[r.avatar_path] ?? null) : null,
    cover_url: r.cover_path ? (urls[r.cover_path] ?? null) : null,
  }))
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
