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
  total_pages: number | null
  current_page: number | null
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
  /** Total de páginas (opcional), sugerido pela busca. */
  total_pages?: number | null
}

const BASE_FIELDS =
  'id,user_id,title,author,cover_url,started_at,finished_at,abandoned_at,rating,review,attachment_path,attachment_public,posts(count),book_likes(count)'
// Banco ainda sem as colunas de páginas: o app continua funcionando sem elas.
let FIELDS = `${BASE_FIELDS},total_pages,current_page`
const missingPages = (e: { message: string } | null) => !!e && /total_pages|current_page/.test(e.message)

function toBook(row: unknown): Book {
  const r = row as Omit<Book, 'proofs' | 'likes' | 'rating' | 'total_pages' | 'current_page'> & {
    total_pages?: number | null
    current_page?: number | null
    rating: number | string | null
    posts: { count: number }[]
    book_likes: { count: number }[]
  }
  return {
    ...r,
    rating: r.rating === null ? null : Number(r.rating),
    total_pages: r.total_pages ?? null,
    current_page: r.current_page ?? null,
    proofs: r.posts?.[0]?.count ?? 0,
    likes: r.book_likes?.[0]?.count ?? 0,
  }
}

export async function fetchCurrentBook(userId: string): Promise<Book | null> {
  const query = () => supabase.from('books').select(FIELDS).eq('user_id', userId).is('finished_at', null).is('abandoned_at', null).maybeSingle()
  let { data, error } = await query()
  if (missingPages(error)) {
    FIELDS = BASE_FIELDS
    ;({ data, error } = await query())
  }
  if (error) throw error
  return data ? toBook(data) : null
}

export async function fetchShelf(userId: string): Promise<Book[]> {
  const base = () => supabase.from('books').select(BASE_FIELDS).eq('user_id', userId).not('finished_at', 'is', null)
  // Ordem escolhida pela pessoa; livros sem posição (recém-terminados) vêm primeiro.
  let { data, error } = await base()
    .order('shelf_order', { ascending: true, nullsFirst: true })
    .order('finished_at', { ascending: false })
  // Banco ainda sem a coluna da ordem: fica do mais recente pro mais antigo.
  if (error && /shelf_order/.test(error.message)) ({ data, error } = await base().order('finished_at', { ascending: false }))
  if (error) throw error
  return (data ?? []).map(toBook)
}

/** Salva a ordem da estante (ids na ordem em que devem aparecer). */
export async function saveShelfOrder(ids: string[]) {
  const { error } = await supabase.rpc('set_shelf_order', { ids })
  if (error) {
    if (/set_shelf_order/.test(error.message)) throw new Error('Falta rodar o SQL da ordem da estante no Supabase.')
    throw error
  }
}

/** Últimos livros terminados por qualquer pessoa do grupo. */
export async function fetchGroupFinished(limit = 50): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(BASE_FIELDS)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toBook)
}

export async function startBook(draft: BookDraft) {
  const row: Record<string, unknown> = { title: draft.title.trim(), author: draft.author.trim() || null, cover_url: draft.cover_url }
  if (draft.total_pages) row.total_pages = draft.total_pages
  let { error } = await supabase.from('books').insert(row)
  if (missingPages(error)) {
    delete row.total_pages
    ;({ error } = await supabase.from('books').insert(row))
  }
  // Capa de um endereço que o banco ainda não aceita: salva sem a capa.
  if (error?.code === '23514' && /cover_url/.test(error.message)) ({ error } = await supabase.from('books').insert({ ...row, cover_url: null }))
  if (error) {
    if (error.code === '23505') throw new Error('Você já está lendo um livro. Termine ou largue ele antes.')
    throw error
  }
}

/** Total de páginas e página atual do livro em andamento. */
export async function setBookPages(id: string, total: number | null, current: number | null) {
  const { error } = await supabase.from('books').update({ total_pages: total, current_page: current }).eq('id', id)
  if (error) throw error
}

/** Resumo de 140 letras ou mais (ou um PDF de anotações) vale +30 ao terminar o livro. */
export const SUMMARY_MIN = 140
export const BOOK_BONUS = 30

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
  if (error?.code === '23514' && /cover_url/.test(error.message)) {
    ;({ error } = await supabase.from('want_to_read').insert({ ...row, cover_url: null }))
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
/** Metal da nota: bronze abaixo de 5, prata de 5 a 7,9 e ouro de 8 pra cima. */
export function ratingTier(r: number): 'bronze' | 'silver' | 'gold' {
  if (r >= 8) return 'gold'
  if (r >= 5) return 'silver'
  return 'bronze'
}

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
