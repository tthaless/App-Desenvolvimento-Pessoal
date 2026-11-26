import { BookOpen, Dumbbell, PartyPopper } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { StoryItem } from '../types'

/** Ícone de cada tipo de foto: exercício, leitura ou rolê. */
export default function ActivityIcon({ activity, ...props }: { activity: StoryItem['activity'] } & LucideProps) {
  const Icon = activity === 'exercicio' ? Dumbbell : activity === 'leitura' ? BookOpen : PartyPopper
  return <Icon aria-hidden {...props} />
}
