/** Data de hoje no fuso de São Paulo, no formato AAAA-MM-DD (igual ao banco). */
export function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

/** Reduz a foto para no máximo 1280px e ~150-250 KB antes de enviar. */
export async function compressImage(file: File, maxSize = 1280, quality = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a foto.'))),
      'image/jpeg',
      quality,
    ),
  )
}

/** Recorta o centro da foto em quadrado, para a foto de perfil. */
export async function squareAvatar(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, side)
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))), 'image/jpeg', 0.8),
  )
}

export function errorMessage(e: unknown): string {
  const err = e as { message?: string; code?: string }
  const msg = err?.message ?? ''
  if (err?.code === '23505') return 'Esse nome já está em uso por outra pessoa do grupo.'
  if (err?.code === '23514') return 'Algum campo passou do limite de caracteres.'
  if (msg.includes('Database error saving new user'))
    return 'Código de convite inválido ou nome de usuário já em uso.'
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Esse email já tem conta. Use "Entrar".'
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar (veja sua caixa de entrada).'
  return msg || 'Algo deu errado. Tente de novo.'
}

const SEEN_KEY = 'streak:seen'

export function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300)))
  } catch {
    /* sem armazenamento: tudo bem, só não lembra o que já viu */
  }
}
