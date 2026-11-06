import { supabase } from './supabase'

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  started_at: string
  finished_at: string | null
  abandoned_at: string | null
  rating: number | null
  review: string | null
  proofs: number
}

const FIELDS = 'id,user_id,title,author,started_at,finished_at,abandoned_at,rating,review,posts(count)'

function toBook(row: unknown): Book {
  const r = row as Omit<Book, 'proofs' | 'rating'> & { rating: number | string | null; posts: { count: number }[] }
  return { ...r, rating: r.rating === null ? null : Number(r.rating), proofs: r.posts[0]?.count ?? 0 }
}

export async function fetchCurrentBook(userId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select(FIELDS)
    .eq('user_id', userId)
    .is('finished_at', null)
    .is('abandoned_at', null)
    .maybeSingle()
  if (error) throw error
  return data ? toBook(data) : null
}

export async function fetchShelf(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(FIELDS)
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toBook)
}

export async function startBook(title: string, author: string) {
  const { error } = await supabase.from('books').insert({ title: title.trim(), author: author.trim() || null })
  if (error) throw error
}

export async function finishBook(id: string, rating: number, review: string) {
  const { error } = await supabase.rpc('finish_book', { book: id, nota: rating, comentario: review })
  if (error) throw error
}

export async function abandonBook(id: string) {
  const { error } = await supabase.rpc('abandon_book', { book: id })
  if (error) throw error
}

/** 8.5 → "8,5" */
export function formatRating(r: number): string {
  return r.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

/** Dias de leitura, contando o primeiro: começou e terminou no mesmo dia = 1. */
export function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}
