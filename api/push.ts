import webpush from 'web-push'

// Envia notificações para o celular (Web Push).
// Quem chama é o próprio banco (Supabase), com a senha combinada em PUSH_SECRET.
// O banco já manda os aparelhos de destino, então aqui não precisa de acesso ao banco.

interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
}

interface Body {
  subscriptions?: Subscription[]
  title?: string
  body?: string
  url?: string
  tag?: string
}

interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: Body | string
}

interface Res {
  status: (code: number) => Res
  json: (data: unknown) => void
  end: () => void
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  const missing = Object.entries({ PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY })
    .filter(([, v]) => !v?.trim())
    .map(([k]) => k)
  // Diz só o nome do que falta, nunca o valor.
  if (missing.length) return res.status(500).json({ error: 'faltam variáveis de ambiente', faltando: missing })
  if (req.headers['x-push-secret'] !== PUSH_SECRET!.trim()) return res.status(401).json({ error: 'senha diferente' })

  const data: Body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  const subs = (data.subscriptions ?? []).slice(0, 20)
  if (!subs.length || !data.title) return res.status(400).json({ error: 'sem destino ou título' })

  webpush.setVapidDetails('https://farm-xp.vercel.app', VAPID_PUBLIC_KEY!.trim(), VAPID_PRIVATE_KEY!.trim())
  const payload = JSON.stringify({
    title: String(data.title).slice(0, 80),
    body: String(data.body ?? '').slice(0, 180),
    url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/',
    tag: data.tag,
  })

  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 60 * 60 })),
  )
  // Aparelho que desinstalou ou bloqueou: o banco apaga essa inscrição depois.
  const gone = results.flatMap((r, i) => {
    const code = r.status === 'rejected' ? (r.reason as { statusCode?: number })?.statusCode : undefined
    return code === 404 || code === 410 ? [subs[i].endpoint] : []
  })
  res.status(200).json({ sent: results.filter((r) => r.status === 'fulfilled').length, gone })
}
