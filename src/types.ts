export type Activity = 'exercicio' | 'leitura'

export const ACTIVITY: Record<Activity, { label: string; verb: string; emoji: string }> = {
  exercicio: { label: 'Exercício', verb: 'Treinei hoje', emoji: '💪' },
  leitura: { label: 'Leitura', verb: 'Li hoje', emoji: '📖' },
}

export interface Post {
  id: string
  user_id: string
  activity: Activity
  photo_path: string
  caption: string | null
  created_at: string
  day: string
}

/** Item dos stories: prova de exercício, de leitura ou check-in do desafio. */
export interface StoryItem {
  id: string
  user_id: string
  activity: Activity | 'desafio'
  photo_path: string
  caption: string | null
  created_at: string
}

export const STORY_LABEL: Record<StoryItem['activity'], string> = {
  exercicio: '💪 Exercício',
  leitura: '📖 Leitura',
  desafio: '🎯 Desafio',
}

export interface Member {
  id: string
  username: string
  avatar_path: string | null
  avatar_url: string | null
  bio: string | null
  current_book: string | null
  exercises: string | null
}

export interface StreakRow {
  user_id: string
  activity: Activity
  current_streak: number
  best_streak: number
}

export interface RankingRow {
  user_id: string
  username: string
  pontos: number
  dias: number
}
