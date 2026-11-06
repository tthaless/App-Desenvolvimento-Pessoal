import { supabase } from './supabase'

export interface StoryComment {
  id: string
  story_key: string
  owner_id: string
  user_id: string
  body: string
  created_at: string
}

export async function fetchCommentCounts(keys: string[]): Promise<Record<string, number>> {
  if (!keys.length) return {}
  const { data } = await supabase.from('story_comments').select('story_key').in('story_key', keys)
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { story_key: string }[]) counts[row.story_key] = (counts[row.story_key] ?? 0) + 1
  return counts
}

export async function fetchStoryComments(key: string): Promise<StoryComment[]> {
  const { data, error } = await supabase
    .from('story_comments')
    .select('id,story_key,owner_id,user_id,body,created_at')
    .eq('story_key', key)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as StoryComment[]
}

export async function addStoryComment(key: string, body: string) {
  const { error } = await supabase.from('story_comments').insert({ story_key: key, body })
  if (error) throw error
}

export async function deleteStoryComment(id: string) {
  const { error } = await supabase.from('story_comments').delete().eq('id', id)
  if (error) throw error
}
