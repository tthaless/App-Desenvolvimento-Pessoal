import { supabase } from './supabase'

export interface StoryView {
  post_id: string
  viewer_id: string
  viewed_at: string
}

/** Quem viu cada story, do mais recente pro mais antigo. Todo o grupo enxerga. */
export async function fetchViews(postIds: string[]): Promise<Record<string, StoryView[]>> {
  if (!postIds.length) return {}
  const { data, error } = await supabase
    .from('story_views')
    .select('post_id,viewer_id,viewed_at')
    .in('post_id', postIds)
    .order('viewed_at', { ascending: false })
  // Banco ainda sem a tabela: só não mostra.
  if (error) return {}
  const out: Record<string, StoryView[]> = {}
  for (const v of (data ?? []) as StoryView[]) (out[v.post_id] ??= []).push(v)
  return out
}

/** Marca que eu vi este story. Ver de novo não muda nada. */
export async function recordView(postId: string) {
  const { error } = await supabase.from('story_views').insert({ post_id: postId })
  // 23505: já tinha visto.
  if (error && error.code !== '23505') throw error
}
