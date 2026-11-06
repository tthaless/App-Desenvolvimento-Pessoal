import { supabase } from './supabase'
import { compressImage } from './utils'

export interface FeedPost {
  id: string
  user_id: string
  body: string | null
  photo_path: string | null
  created_at: string
  comments: number
}

export interface FeedComment {
  id: string
  post_id: string
  user_id: string
  body: string | null
  photo_path: string | null
  created_at: string
}

const DAY = 24 * 60 * 60 * 1000

export async function fetchPosts(userId?: string): Promise<FeedPost[]> {
  let query = supabase
    .from('feed_posts')
    .select('id,user_id,body,photo_path,created_at,feed_comments(count)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as unknown as Omit<FeedPost, 'comments'> & {
      feed_comments: { count: number }[]
    }
    return {
      id: r.id,
      user_id: r.user_id,
      body: r.body,
      photo_path: r.photo_path,
      created_at: r.created_at,
      comments: r.feed_comments[0]?.count ?? 0,
    }
  })
}

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('feed_comments')
    .select('id,post_id,user_id,body,photo_path,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as FeedComment[]
}

async function uploadFeedPhoto(userId: string, file: File): Promise<string> {
  const path = `${userId}/feed/${Date.now()}.jpg`
  const blob = await compressImage(file)
  const { error } = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function createPost(userId: string, body: string, file: File | null) {
  const photo_path = file ? await uploadFeedPhoto(userId, file) : null
  const { error } = await supabase.from('feed_posts').insert({ body: body || null, photo_path })
  if (error) {
    if (photo_path) await supabase.storage.from('provas').remove([photo_path])
    throw error
  }
}

export async function createComment(userId: string, postId: string, body: string, file: File | null) {
  const photo_path = file ? await uploadFeedPhoto(userId, file) : null
  const { error } = await supabase.from('feed_comments').insert({ post_id: postId, body: body || null, photo_path })
  if (error) {
    if (photo_path) await supabase.storage.from('provas').remove([photo_path])
    throw error
  }
}

export async function deletePost(post: FeedPost) {
  const { error } = await supabase.from('feed_posts').delete().eq('id', post.id)
  if (error) throw error
  if (post.photo_path) await supabase.storage.from('provas').remove([post.photo_path])
}

export async function deleteComment(comment: FeedComment) {
  const { error } = await supabase.from('feed_comments').delete().eq('id', comment.id)
  if (error) throw error
  if (comment.photo_path) await supabase.storage.from('provas').remove([comment.photo_path])
}

/** "some em 5h" */
export function expiresIn(createdAt: string): string {
  const left = new Date(createdAt).getTime() + DAY - Date.now()
  if (left <= 0) return 'sumindo'
  const h = Math.floor(left / 3_600_000)
  return h >= 1 ? `some em ${h}h` : `some em ${Math.max(1, Math.floor(left / 60_000))} min`
}

/**
 * Apaga do armazenamento as fotos do feed que esta pessoa postou há mais de 24h.
 * Roda no máximo uma vez por hora em cada aparelho.
 */
export async function cleanupMyFeedPhotos(userId: string) {
  const KEY = 'streak:cleanup'
  try {
    if (Date.now() - Number(localStorage.getItem(KEY) ?? 0) < 60 * 60 * 1000) return
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* sem armazenamento: roda mesmo assim */
  }
  const { data } = await supabase.storage.from('provas').list(`${userId}/feed`, { limit: 1000 })
  const old = (data ?? [])
    .filter((f) => Number(f.name.split('.')[0]) < Date.now() - DAY - 60 * 60 * 1000)
    .map((f) => `${userId}/feed/${f.name}`)
  if (old.length) await supabase.storage.from('provas').remove(old)
}
