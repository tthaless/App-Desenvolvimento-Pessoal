import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Números de uma pessoa, vindos do banco (função badge_stats). */
export interface BadgeStats {
  semanas_vencidas: number
  meses_vencidos: number
  maior_streak_exercicio: number
  maior_streak_leitura: number
  dias_exercicio: number
  dias_leitura: number
  dias_combo: number
  dias_fim_de_semana: number
  provas_cedo: number
  provas_noite: number
  livros: number
  resumos: number
  pdfs: number
  livro_rapido: boolean
  paginas: number
}

export type BadgeIcon =
  | 'crown'
  | 'trophy'
  | 'flame'
  | 'flame-book'
  | 'book'
  | 'pages'
  | 'feather'
  | 'notes'
  | 'rocket'
  | 'dumbbell'
  | 'combo'
  | 'sunrise'
  | 'moon'
  | 'calendar'

export type BadgeGroup = 'Vitórias' | 'Sequência' | 'Leitura' | 'Treino' | 'Especiais'

/** Bronze, prata, ouro e diamante. */
export type Tier = 1 | 2 | 3 | 4
export const TIER_NAME: Record<Tier, string> = { 1: 'Bronze', 2: 'Prata', 3: 'Ouro', 4: 'Diamante' }

export interface BadgeDef {
  id: string
  group: BadgeGroup
  name: string
  icon: BadgeIcon
  /** O que conta, no plural ("semanas vencidas"). */
  unit: string
  /** Mesma coisa no singular, quando a meta pode ser 1. */
  unitOne?: string
  /** Meta de cada nível. Insígnia de um nível só tem uma meta. */
  goals: number[]
  value: (s: BadgeStats) => number
  /** Texto curto de como conquistar. */
  hint: string
}

export const BADGES: BadgeDef[] = [
  {
    id: 'coroa',
    group: 'Vitórias',
    name: 'Coroa da semana',
    icon: 'crown',
    unit: 'semanas em 1º',
    unitOne: 'semana em 1º',
    goals: [1, 5, 10, 20],
    value: (s) => s.semanas_vencidas,
    hint: 'Termine a semana em 1º no ranking.',
  },
  {
    id: 'taca',
    group: 'Vitórias',
    name: 'Taça do mês',
    icon: 'trophy',
    unit: 'meses em 1º',
    unitOne: 'mês em 1º',
    goals: [1, 3, 6, 12],
    value: (s) => s.meses_vencidos,
    hint: 'Termine o mês em 1º no ranking.',
  },
  {
    id: 'chama-treino',
    group: 'Sequência',
    name: 'Chama do treino',
    icon: 'flame',
    unit: 'dias seguidos de exercício',
    goals: [7, 30, 60, 100],
    value: (s) => s.maior_streak_exercicio,
    hint: 'Maior sequência de dias com prova de exercício.',
  },
  {
    id: 'chama-leitura',
    group: 'Sequência',
    name: 'Chama da leitura',
    icon: 'flame-book',
    unit: 'dias seguidos de leitura',
    goals: [7, 30, 60, 100],
    value: (s) => s.maior_streak_leitura,
    hint: 'Maior sequência de dias com prova de leitura.',
  },
  {
    id: 'combo',
    group: 'Sequência',
    name: 'Corpo e mente',
    icon: 'combo',
    unit: 'dias com as duas provas',
    goals: [10, 30, 100, 200],
    value: (s) => s.dias_combo,
    hint: 'Dias em que você postou exercício e leitura.',
  },
  {
    id: 'leitor',
    group: 'Leitura',
    name: 'Leitor',
    icon: 'book',
    unit: 'livros terminados',
    unitOne: 'livro terminado',
    goals: [1, 5, 10, 25],
    value: (s) => s.livros,
    hint: 'Livros que você terminou no app.',
  },
  {
    id: 'paginas',
    group: 'Leitura',
    name: 'Folheador',
    icon: 'pages',
    unit: 'páginas lidas',
    goals: [500, 2000, 5000, 10000],
    value: (s) => s.paginas,
    hint: 'Some páginas informando onde parou nas provas de leitura.',
  },
  {
    id: 'resenhista',
    group: 'Leitura',
    name: 'Resenhista',
    icon: 'feather',
    unit: 'resumos escritos',
    unitOne: 'resumo escrito',
    goals: [1, 5, 10, 20],
    value: (s) => s.resumos,
    hint: 'Livros terminados com resumo de 140 letras ou mais.',
  },
  {
    id: 'anotador',
    group: 'Leitura',
    name: 'Anotador',
    icon: 'notes',
    unit: 'PDFs de anotações',
    unitOne: 'PDF de anotações',
    goals: [1, 3, 10],
    value: (s) => s.pdfs,
    hint: 'Livros com PDF de anotações anexado.',
  },
  {
    id: 'maratona',
    group: 'Leitura',
    name: 'Maratona',
    icon: 'rocket',
    unit: 'livro em até 7 dias',
    goals: [1],
    value: (s) => (s.livro_rapido ? 1 : 0),
    hint: 'Termine um livro em até 7 dias depois de começar.',
  },
  {
    id: 'atleta',
    group: 'Treino',
    name: 'Atleta',
    icon: 'dumbbell',
    unit: 'dias de exercício',
    goals: [10, 50, 150, 300],
    value: (s) => s.dias_exercicio,
    hint: 'Dias com prova de exercício.',
  },
  {
    id: 'madrugador',
    group: 'Especiais',
    name: 'Madrugador',
    icon: 'sunrise',
    unit: 'dias com prova antes das 7h',
    goals: [10],
    value: (s) => s.provas_cedo,
    hint: 'Poste provas antes das 7h da manhã.',
  },
  {
    id: 'coruja',
    group: 'Especiais',
    name: 'Coruja',
    icon: 'moon',
    unit: 'dias com prova depois das 22h',
    goals: [10],
    value: (s) => s.provas_noite,
    hint: 'Poste provas depois das 22h.',
  },
  {
    id: 'sem-folga',
    group: 'Especiais',
    name: 'Sem folga',
    icon: 'calendar',
    unit: 'dias de fim de semana com prova',
    goals: [10],
    value: (s) => s.dias_fim_de_semana,
    hint: 'Fim de semana é livre, mas você posta mesmo assim.',
  },
]

export const BADGE_GROUPS: BadgeGroup[] = ['Vitórias', 'Sequência', 'Leitura', 'Treino', 'Especiais']

export interface BadgeProgress {
  def: BadgeDef
  value: number
  /** 0 = ainda não conquistou. */
  level: number
  /** Nível em metal: insígnias de nível único são sempre ouro. */
  tier: Tier | null
  next: number | null
}

export function progressOf(def: BadgeDef, stats: BadgeStats): BadgeProgress {
  const value = def.value(stats)
  const level = def.goals.filter((g) => value >= g).length
  const tier: Tier | null = level === 0 ? null : def.goals.length === 1 ? 3 : (Math.min(4, level) as Tier)
  return { def, value, level, tier, next: def.goals[level] ?? null }
}

/** Unidade no singular ou plural conforme o número. */
export const unitOf = (def: BadgeDef, n: number) => (n === 1 && def.unitOne ? def.unitOne : def.unit)

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)

// ---------- Busca ----------

const cache = new Map<string, { at: number; stats: BadgeStats }>()

export function useBadgeStats(userId: string): BadgeStats | null | 'erro' {
  const hit = cache.get(userId)
  const [stats, setStats] = useState<BadgeStats | null | 'erro'>(hit?.stats ?? null)
  useEffect(() => {
    const c = cache.get(userId)
    if (c && Date.now() - c.at < 5 * 60 * 1000) return
    let active = true
    supabase.rpc('badge_stats', { alvo: userId }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) return setStats('erro')
      cache.set(userId, { at: Date.now(), stats: data as BadgeStats })
      setStats(data as BadgeStats)
    })
    return () => {
      active = false
    }
  }, [userId])
  return stats
}

export async function saveFeatured(userId: string, ids: string[]) {
  const { error } = await supabase.from('profiles').update({ featured_badges: ids.slice(0, 3) }).eq('id', userId)
  if (error) throw error
}
