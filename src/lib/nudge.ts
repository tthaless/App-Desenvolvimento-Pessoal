import { supabase } from './supabase'

const KEY = 'streak:cutucou'

/** Quem eu já cutuquei hoje (neste aparelho), pra o botão não ficar oferecendo de novo. */
export function nudgedToday(day: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { day?: string; ids?: string[] }
    return new Set(raw.day === day ? raw.ids : [])
  } catch {
    return new Set()
  }
}

function remember(day: string, id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, ids: [...nudgedToday(day), id] }))
  } catch {
    /* sem armazenamento */
  }
}

/** Manda um aviso pra quem ainda não postou hoje. Uma vez por dia por pessoa. */
export async function nudge(targetId: string, day: string) {
  const { error } = await supabase.rpc('nudge', { alvo: targetId })
  if (error) {
    if (/já cutucou|já postou/.test(error.message)) {
      remember(day, targetId)
      throw new Error(error.message)
    }
    if (/nudge/.test(error.message)) throw new Error('Falta rodar o SQL de cutucar no Supabase.')
    throw error
  }
  remember(day, targetId)
}
