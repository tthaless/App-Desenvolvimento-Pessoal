import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  console.warn('Supabase não configurado: copie .env.example para .env e preencha as chaves.')
}

/** O app foi aberto pelo link de "esqueci minha senha" (lido antes do cliente limpar o endereço). */
export const openedFromRecovery = typeof location !== 'undefined' && /type=recovery/.test(location.hash + location.search)

export const supabase = createClient(url ?? '', anonKey ?? '')
