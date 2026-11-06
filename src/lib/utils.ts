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

type Decoded = { source: CanvasImageSource; width: number; height: number; done: () => void }

const UNSUPPORTED =
  'Não consegui abrir essa foto. Se ela for HEIC (padrão de iPhone e de alguns Samsung), tire um print dela e envie o print, ou mude a câmera para "Mais compatível".'

/**
 * Abre a foto de jeitos diferentes, porque cada celular aceita um:
 * 1) createImageBitmap girando pela orientação da câmera; 2) sem a opção (Safari antigo);
 * 3) por uma <img>, que funciona até onde o createImageBitmap não existe.
 */
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    for (const opts of [{ imageOrientation: 'from-image' } as ImageBitmapOptions, undefined]) {
      try {
        const bmp = await (opts ? createImageBitmap(file, opts) : createImageBitmap(file))
        if (bmp.width && bmp.height) return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() }
      } catch {
        /* tenta o próximo jeito */
      }
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    if (!img.naturalWidth) throw new Error()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new Error(UNSUPPORTED)
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a foto. Tente uma foto menor ou um print dela.'))),
      'image/jpeg',
      quality,
    ),
  )
}

/** Reduz a foto para no máximo 1080px e ~100-150 KB antes de enviar. */
export async function compressImage(file: File, maxSize = 1080, quality = 0.72): Promise<Blob> {
  const img = await decodeImage(file)
  try {
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img.source, 0, 0, canvas.width, canvas.height)
    return await toJpeg(canvas, quality)
  } finally {
    img.done()
  }
}

/** Recorta o centro da foto em quadrado, para a foto de perfil. */
export async function squareAvatar(file: File, size = 400): Promise<Blob> {
  const img = await decodeImage(file)
  try {
    const side = Math.min(img.width, img.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = Math.min(size, side)
    canvas
      .getContext('2d')!
      .drawImage(img.source, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
    return await toJpeg(canvas, 0.82)
  } finally {
    img.done()
  }
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
  if (/payload too large|exceeded the maximum allowed size/i.test(msg)) return 'A foto ficou grande demais. Tente outra ou um print dela.'
  if (/mime type|invalid_mime/i.test(msg)) return 'Esse tipo de arquivo não é aceito. Use uma foto JPG ou PNG.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
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

/** Bônus de pontos pelo tamanho do streak naquele dia (igual à conta do banco). */
export function streakBonus(day: number): number {
  if (day >= 30) return 5
  if (day >= 14) return 4
  if (day >= 7) return 3
  if (day >= 3) return 2
  return 0
}

/** Quantos dias faltam pro próximo degrau do bônus. */
export function nextBonusStep(day: number): { in: number; bonus: number } | null {
  for (const step of [3, 7, 14, 30]) if (day < step) return { in: step - day, bonus: streakBonus(step) }
  return null
}
