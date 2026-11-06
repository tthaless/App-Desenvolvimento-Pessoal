import { supabase } from './supabase'
import type { StoryItem } from '../types'

/** Apaga uma prova minha (ou check-in do desafio), a foto e os comentários dela. */
export async function deleteStory(item: StoryItem) {
  if (item.key.startsWith('desafio:')) {
    const [, ideaId, userId, day] = item.key.split(':')
    const { error } = await supabase.from('challenge_checkins').delete().match({ idea_id: ideaId, user_id: userId, day })
    if (error) throw error
  } else {
    const { error } = await supabase.from('posts').delete().eq('id', item.id)
    if (error) throw error
  }
  await Promise.all([
    supabase.storage.from('provas').remove([item.photo_path]),
    supabase.from('story_comments').delete().eq('story_key', item.key),
  ])
}
