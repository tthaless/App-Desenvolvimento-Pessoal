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
  profiles: { username: string } | null
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
