import { supabase } from './supabase'
import { BADGES, progressOf } from './badges'
import type { BadgeStats } from './badges'

/** Números que a pessoa pode fixar na linha do perfil (até 4). */
export const PIN_STATS: { id: string; label: string; value: (s: BadgeStats) => number }[] = [
  { id: 'dias_treino', label: 'dias de treino', value: (s) => s.dias_exercicio },
  { id: 'dias_leitura', label: 'dias de leitura', value: (s) => s.dias_leitura },
  { id: 'livros', label: 'livros lidos', value: (s) => s.livros },
  { id: 'paginas', label: 'páginas lidas', value: (s) => s.paginas },
  { id: 'insignias', label: 'insígnias', value: (s) => BADGES.filter((d) => progressOf(d, s).level > 0).length },
  { id: 'recorde', label: 'maior sequência', value: (s) => Math.max(s.maior_streak_exercicio, s.maior_streak_leitura) },
]

/** Cartões que a pessoa pode mostrar na parte Perfil. */
export const PIN_CARDS = { sequencias: 'Sequências', calendario: 'Calendário do mês' } as const
export type PinCard = keyof typeof PIN_CARDS

export const MAX_PINNED_STATS = 4

export async function savePins(userId: string, pins: string[]) {
  const { error } = await supabase.from('profiles').update({ pinned_stats: pins }).eq('id', userId)
  if (error) {
    if (/pinned_stats/.test(error.message)) throw new Error('Falta rodar o SQL de fixar no perfil no Supabase.')
    throw error
  }
}
