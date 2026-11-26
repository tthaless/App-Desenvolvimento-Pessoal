import { createClient } from '@supabase/supabase-js'

// Limpeza diária das fotos de provas, rolês e feed com mais de 24h.
// Roda sozinha pela Vercel (agenda em vercel.json), mesmo pra quem parou de abrir o app.
// Precisa de duas variáveis na Vercel: CRON_SECRET e SUPABASE_SECRET_KEY.

interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface Res {
  status: (code: number) => Res
  json: (data: unknown) => void
  end: () => void
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim() || 'https://wgqhhfevfqewphicgzei.supabase.co'

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { CRON_SECRET, SUPABASE_SECRET_KEY } = process.env
  const missing = Object.entries({ CRON_SECRET, SUPABASE_SECRET_KEY })
    .filter(([, v]) => !v?.trim())
    .map(([k]) => k)
  // Diz só o nome do que falta, nunca o valor.
  if (missing.length) return res.status(500).json({ error: 'faltam variáveis de ambiente', faltando: missing })
  // A Vercel manda essa senha sozinha quando é ela que chama.
  if (req.headers.authorization !== `Bearer ${CRON_SECRET!.trim()}`) return res.status(401).json({ error: 'sem permissão' })

  const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY!.trim(), { auth: { persistSession: false } })
  let removed = 0
  // Até 5 rodadas de 1000 por dia; o que sobrar sai no dia seguinte.
  for (let round = 0; round < 5; round++) {
    const { data, error } = await db.rpc('old_photos')
    if (error) return res.status(500).json({ error: error.message, removidas: removed })
    const names = ((data ?? []) as { name: string }[]).map((r) => r.name)
    if (!names.length) break
    for (let i = 0; i < names.length; i += 100) {
      const { error: rmError } = await db.storage.from('provas').remove(names.slice(i, i + 100))
      if (rmError) return res.status(500).json({ error: rmError.message, removidas: removed })
      removed += Math.min(100, names.length - i)
    }
    if (names.length < 1000) break
  }
  res.status(200).json({ removidas: removed })
}
