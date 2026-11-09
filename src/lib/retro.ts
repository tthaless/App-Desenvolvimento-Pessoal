import { supabase } from './supabase'
import { todaySP } from './utils'

export interface RetroPerson {
  user_id: string
  username: string
  pontos: number
  posicao: number
  dias_exercicio: number
  dias_leitura: number
  dias_combo: number
  paginas: number
  provas: number
  livros: number
  hora_exercicio: number | null
  hora_leitura: number | null
  streak_exercicio: number
  streak_leitura: number
}

export interface RetroDay {
  user_id: string
  day: string
  ex: boolean
  rd: boolean
  pts: number
  pages: number
}

export interface RetroBook {
  user_id: string
  title: string
  rating: number | null
  dias: number
}

export interface RetroData {
  inicio: string
  fim: string
  pessoas: RetroPerson[]
  dias: RetroDay[]
  livros: RetroBook[]
}

export type PeriodKind = 'semana' | 'mes'

export interface Period {
  kind: PeriodKind
  inicio: string
  fim: string
  /** Período que ainda não acabou. */
  aberto: boolean
}

// ---------- Datas (AAAA-MM-DD) ----------

const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}
const fmt = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (d: string, n: number) => {
  const x = parse(d)
  x.setUTCDate(x.getUTCDate() + n)
  return fmt(x)
}
export const daysIn = (p: { inicio: string; fim: string }) => {
  const out: string[] = []
  for (let d = p.inicio; d <= p.fim; d = addDays(d, 1)) out.push(d)
  return out
}

/** Semana (segunda a domingo) ou mês. offset 0 = atual, -1 = anterior. */
export function periodOf(kind: PeriodKind, offset = 0, today = todaySP()): Period {
  if (kind === 'semana') {
    const t = parse(today)
    const monday = addDays(today, -((t.getUTCDay() + 6) % 7) + offset * 7)
    const fim = addDays(monday, 6)
    return { kind, inicio: monday, fim, aberto: fim >= today }
  }
  const t = parse(today)
  const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + offset, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + offset + 1, 0))
  return { kind, inicio: fmt(first), fim: fmt(last), aberto: fmt(last) >= today }
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function weekdayOf(d: string) {
  return parse(d).getUTCDay()
}

/** "2 a 8 de nov." ou "novembro". */
export function periodLabel(p: Period) {
  if (p.kind === 'mes') return MONTHS[parse(p.inicio).getUTCMonth()]
  const a = parse(p.inicio)
  const b = parse(p.fim)
  const mb = MONTHS[b.getUTCMonth()].slice(0, 3)
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} a ${b.getUTCDate()} de ${mb}.`
    : `${a.getUTCDate()} de ${MONTHS[a.getUTCMonth()].slice(0, 3)}. a ${b.getUTCDate()} de ${mb}.`
}

// ---------- Busca ----------

const cache = new Map<string, { at: number; data: RetroData }>()

export async function fetchRetro(p: { inicio: string; fim: string }): Promise<RetroData> {
  // Até hoje: o resto do período ainda não aconteceu.
  const fim = p.fim > todaySP() ? todaySP() : p.fim
  const key = `${p.inicio}|${fim}`
  const hit = cache.get(key)
  // Período fechado não muda; o aberto vale por 1 minuto.
  if (hit && (fim < todaySP() || Date.now() - hit.at < 60_000)) return hit.data
  const { data, error } = await supabase.rpc('retro', { inicio: p.inicio, fim })
  if (error) throw error
  const out = data as RetroData
  cache.set(key, { at: Date.now(), data: out })
  return out
}

// ---------- Números de uma pessoa comparados com o grupo ----------

export interface Summary {
  me: RetroPerson | null
  /** Média de quem postou pelo menos uma prova no período. */
  avg: Record<'pontos' | 'dias' | 'paginas' | 'livros' | 'dias_exercicio' | 'dias_leitura', number>
  ativos: number
  myDays: RetroDay[]
  bestDay: RetroDay | null
  bestPagesDay: RetroDay | null
}

export const daysWithProof = (p: RetroPerson) => p.dias_exercicio + p.dias_leitura - p.dias_combo

export function summarize(data: RetroData, userId: string): Summary {
  const me = data.pessoas.find((p) => p.user_id === userId) ?? null
  const active = data.pessoas.filter((p) => p.provas > 0)
  const mean = (f: (p: RetroPerson) => number) => (active.length ? active.reduce((s, p) => s + f(p), 0) / active.length : 0)
  const myDays = data.dias.filter((d) => d.user_id === userId)
  const bestDay = myDays.reduce<RetroDay | null>((b, d) => (!b || d.pts > b.pts ? d : b), null)
  const bestPagesDay = myDays.reduce<RetroDay | null>((b, d) => (d.pages > 0 && (!b || d.pages > b.pages) ? d : b), null)
  return {
    me,
    avg: {
      pontos: mean((p) => p.pontos),
      dias: mean(daysWithProof),
      paginas: mean((p) => p.paginas),
      livros: mean((p) => p.livros),
      dias_exercicio: mean((p) => p.dias_exercicio),
      dias_leitura: mean((p) => p.dias_leitura),
    },
    ativos: active.length,
    myDays,
    bestDay: bestDay && bestDay.pts > 0 ? bestDay : null,
    bestPagesDay,
  }
}

/** Apelido pelo horário mais comum de postar. */
export function hourPersona(h: number | null): string | null {
  if (h === null || h === undefined) return null
  if (h < 7) return 'madrugador'
  if (h < 12) return 'da manhã'
  if (h < 18) return 'da tarde'
  if (h < 22) return 'da noite'
  return 'coruja'
}

// ---------- Retrospectiva já vista ----------

const SEEN = (p: Period) => `streak:retro:${p.kind}:${p.inicio}`

export function retroSeen(p: Period) {
  try {
    return !!localStorage.getItem(SEEN(p))
  } catch {
    return true
  }
}

export function markRetroSeen(p: Period) {
  try {
    localStorage.setItem(SEEN(p), '1')
  } catch {
    /* tudo bem */
  }
}

/** Retrospectiva pronta pra mostrar no Início: semana passada (seg a qua) ou mês passado (dias 1 a 5). */
export function pendingRetro(today = todaySP()): Period | null {
  const month = periodOf('mes', -1, today)
  if (Number(today.slice(8)) <= 5 && !retroSeen(month)) return month
  const week = periodOf('semana', -1, today)
  const wd = parse(today).getUTCDay()
  if (wd >= 1 && wd <= 3 && !retroSeen(week)) return week
  return null
}
