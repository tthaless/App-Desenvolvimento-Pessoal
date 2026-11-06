import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Links temporários para as fotos do bucket privado.
// Ficam guardados (também entre aberturas do app) para o link não mudar à toa:
// com o mesmo link, o navegador reaproveita a foto que já baixou em vez de baixar de novo.

type Entry = { url: string; expires: number }
const STORE_KEY = 'streak:links'
const cache = new Map<string, Entry>(load())

function load(): [string, Entry][] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, Entry>
    const now = Date.now()
    return Object.entries(raw).filter(([, e]) => e.expires > now)
  } catch {
    return []
  }
}

function persist() {
  try {
    const now = Date.now()
    const live = [...cache.entries()].filter(([, e]) => e.expires > now).slice(-400)
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(live)))
  } catch {
    /* sem armazenamento: guarda só enquanto o app está aberto */
  }
}

/**
 * Devolve links para as fotos, pedindo ao servidor só as que não têm link válido.
 * `ttl` em segundos; um link é reaproveitado enquanto tiver mais de 1/4 da validade pela frente.
 */
export async function signPaths(paths: string[], ttl = 60 * 60): Promise<Record<string, string>> {
  const now = Date.now()
  const margin = (ttl * 1000) / 4
  const unique = [...new Set(paths.filter(Boolean))]
  const missing = unique.filter((p) => (cache.get(p)?.expires ?? 0) < now + margin)
  if (missing.length) {
    const { data } = await supabase.storage.from('provas').createSignedUrls(missing, ttl)
    data?.forEach((d) => {
      if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, expires: Date.now() + ttl * 1000 })
    })
    persist()
  }
  return fromCache(unique)
}

export function useSignedUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const key = paths.filter(Boolean).sort().join('|')
  const [urls, setUrls] = useState<Record<string, string>>(() => fromCache(paths))

  useEffect(() => {
    let active = true
    signPaths(key ? key.split('|') : []).then((u) => active && setUrls(u))
    return () => {
      active = false
    }
  }, [key])

  return urls
}

function fromCache(paths: (string | null | undefined)[]) {
  const out: Record<string, string> = {}
  for (const p of paths) {
    const hit = p ? cache.get(p) : undefined
    if (p && hit) out[p] = hit.url
  }
  return out
}

/** Arquivos novos têm nome único, então o navegador pode guardar por muito tempo. */
export const LONG_CACHE = { cacheControl: '31536000' }
