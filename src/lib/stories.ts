import { supabase } from './supabase'
import type { StoryItem } from '../types'

/** Apaga uma prova minha, a foto e os comentários dela. */
export async function deleteStory(item: StoryItem) {
  const { error } = await supabase.from('posts').delete().eq('id', item.id)
  if (error) throw error
  await Promise.all([
    supabase.storage.from('provas').remove([item.photo_path]),
    supabase.from('story_comments').delete().eq('story_key', item.key),
  ])
}
