export type Activity = 'exercicio' | 'leitura'

export const ACTIVITY: Record<Activity, { label: string; verb: string }> = {
  exercicio: { label: 'Exercício', verb: 'Treinei hoje' },
  leitura: { label: 'Leitura', verb: 'Li hoje' },
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
  /** Identifica a prova nos comentários: "post:<id>" ou "desafio:<ideia>:<pessoa>:<dia>". */
  key: string
  user_id: string
  activity: Activity | 'desafio'
  photo_path: string
  caption: string | null
  created_at: string
}

export const STORY_LABEL: Record<StoryItem['activity'], string> = {
  exercicio: 'Exercício',
  leitura: 'Leitura',
  desafio: 'Desafio',
}

export interface Member {
  id: string
  username: string
  avatar_path: string | null
  avatar_url: string | null
  /** Plano de fundo do topo do perfil. */
  cover_path: string | null
  cover_url: string | null
  bio: string | null
  current_book: string | null
  current_book_author?: string | null
  /** Capa do livro em andamento (Open Library). */
  current_book_cover?: string | null
  /** Total de páginas do livro em andamento, se a pessoa informou. */
  current_book_total_pages?: number | null
  /** Página em que parou no livro em andamento. */
  current_book_page?: number | null
  /** Até 3 insígnias em destaque no topo do perfil. */
  featured_badges?: string[]
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
