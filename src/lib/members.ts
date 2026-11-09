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
  const readingQuery = (fields: string) => supabase.from('books').select(fields).is('finished_at', null).is('abandoned_at', null)
  const profilesQuery = (fields: string) => supabase.from('profiles').select(fields).order('username')
  let [first, reading] = await Promise.all([
    profilesQuery('id,username,avatar_path,cover_path,bio,exercises,featured_badges,pinned_stats'),
    readingQuery('user_id,title,author,cover_url,total_pages,current_page'),
  ])
  // Banco ainda sem as colunas novas: busca sem elas.
  if (first.error && /pinned_stats/.test(first.error.message)) first = await profilesQuery('id,username,avatar_path,cover_path,bio,exercises,featured_badges')
  if (first.error && /featured_badges/.test(first.error.message))
    first = await profilesQuery('id,username,avatar_path,cover_path,bio,exercises')
  if (reading.error && /total_pages|current_page/.test(reading.error.message)) reading = await readingQuery('user_id,title,author,cover_url')
  const profiles = first.error && /cover_path/.test(first.error.message)
    ? await profilesQuery('id,username,avatar_path,bio,exercises')
    : first
  if (profiles.error) throw profiles.error
  type Reading = { user_id: string; title: string; author: string | null; cover_url: string | null; total_pages?: number | null; current_page?: number | null }
  const books = new Map(((reading.data ?? []) as unknown as Reading[]).map((b) => [b.user_id, b]))
  const rows = ((profiles.data ?? []) as unknown as Omit<Member, 'avatar_url' | 'cover_url' | 'current_book' | 'current_book_author' | 'current_book_cover'>[]).map((r) => ({
    ...r,
    cover_path: r.cover_path ?? null,
    current_book: books.get(r.id)?.title ?? null,
    current_book_author: books.get(r.id)?.author ?? null,
    current_book_cover: books.get(r.id)?.cover_url ?? null,
    current_book_total_pages: books.get(r.id)?.total_pages ?? null,
    current_book_page: books.get(r.id)?.current_page ?? null,
    featured_badges: (r as { featured_badges?: string[] }).featured_badges ?? [],
    pinned_stats: (r as { pinned_stats?: string[] }).pinned_stats ?? [],
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
