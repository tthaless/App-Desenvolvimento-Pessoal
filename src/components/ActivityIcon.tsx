import { BookOpen, Dumbbell, Target } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { StoryItem } from '../types'

/** Ícone de cada atividade (exercício ou leitura). */
export default function ActivityIcon({ activity, ...props }: { activity: StoryItem['activity'] } & LucideProps) {
  const Icon = activity === 'exercicio' ? Dumbbell : activity === 'leitura' ? BookOpen : Target
  return <Icon aria-hidden {...props} />
}
