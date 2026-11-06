import { supabase } from './supabase'

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  started_at: string
  finished_at: string | null
  abandoned_at: string | null
  rating: number | null
  review: string | null
  attachment_path: string | null
  attachment_public: boolean
  proofs: number
  likes: number
}

export interface WantItem {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  created_at: string
}

/** Dados de um livro antes de cadastrar (busca na Open Library ou digitado). */
export interface BookDraft {
  title: string
  author: string
  cover_url: string | null
}

const FIELDS =
  'id,user_id,title,author,cover_url,started_at,finished_at,abandoned_at,rating,review,attachment_path,attachment_public,posts(count),book_likes(count)'

function toBook(row: unknown): Book {
  const r = row as Omit<Book, 'proofs' | 'likes' | 'rating'> & {
    rating: number | string | null
    posts: { count: number }[]
    book_likes: { count: number }[]
  }
  return {
    ...r,
    rating: r.rating === null ? null : Number(r.rating),
    proofs: r.posts?.[0]?.count ?? 0,
    likes: r.book_likes?.[0]?.count ?? 0,
  }
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

/** Últimos livros terminados por qualquer pessoa do grupo. */
export async function fetchGroupFinished(limit = 50): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(FIELDS)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toBook)
}

export async function startBook(draft: BookDraft) {
  const { error } = await supabase
    .from('books')
    .insert({ title: draft.title.trim(), author: draft.author.trim() || null, cover_url: draft.cover_url })
  if (error) {
    if (error.code === '23505') throw new Error('Você já está lendo um livro. Termine ou largue ele antes.')
    throw error
  }
}

export async function finishBook(id: string, rating: number, review: string) {
  const { error } = await supabase.rpc('finish_book', { book: id, nota: rating, comentario: review })
  if (error) throw error
}

export async function abandonBook(id: string) {
  const { error } = await supabase.rpc('abandon_book', { book: id })
  if (error) throw error
}

// ---------- Quero ler ----------

/** Todas as listas do grupo (é pouca coisa: dá pra contar quem quer ler o quê). */
export async function fetchWantLists(): Promise<WantItem[]> {
  const { data, error } = await supabase
    .from('want_to_read')
    .select('id,user_id,title,author,cover_url,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WantItem[]
}

/** `fromUser`: de quem é a lista onde a pessoa tocou em "quero ler também" (vira aviso pra ela). */
export async function addWant(draft: BookDraft, fromUser?: string) {
  const row: { title: string; author: string | null; cover_url: string | null; from_user?: string } = { title: draft.title, author: draft.author || null, cover_url: draft.cover_url }
  let { error } = await supabase.from('want_to_read').insert(fromUser ? { ...row, from_user: fromUser } : row)
  // Banco ainda sem a coluna dos avisos: salva sem ela.
  if (error && fromUser && /from_user/.test(error.message)) {
    ;({ error } = await supabase.from('want_to_read').insert(row))
  }
  if (error) {
    if (error.code === '23505') throw new Error('Esse livro já está na sua lista.')
    throw error
  }
}

export async function removeWant(id: string) {
  const { error } = await supabase.from('want_to_read').delete().eq('id', id)
  if (error) throw error
}

export async function startFromWant(id: string) {
  const { error } = await supabase.rpc('start_from_want', { want: id })
  if (error) throw error
}

export const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// ---------- Curtidas (só no post automático do feed) ----------

export async function setBookLike(bookId: string, userId: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from('book_likes').insert({ book_id: bookId })
    : await supabase.from('book_likes').delete().eq('book_id', bookId).eq('user_id', userId)
  if (error && error.code !== '23505') throw error
}

// ---------- Formatação ----------

/** 8.5 → "8,5" */
export function formatRating(r: number): string {
  return r.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

/** Dias de leitura, contando o primeiro: começou e terminou no mesmo dia = 1. */
export function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

/** Tira um livro terminado (ou largado) da estante, com o PDF de anotações. */
export async function deleteBook(book: Pick<Book, 'id' | 'attachment_path'>) {
  const { error, count } = await supabase.from('books').delete({ count: 'exact' }).eq('id', book.id)
  if (error) throw error
  if (!count) throw new Error('Não foi possível excluir. Peça pra rodar o SQL de excluir livro no Supabase.')
  if (book.attachment_path) await supabase.storage.from('anexos').remove([book.attachment_path])
}
