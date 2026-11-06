import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Links temporários para fotos do bucket privado, com cache para não pedir de novo.
const TTL = 60 * 60 // 1h
const cache = new Map<string, { url: string; expires: number }>()

export function useSignedUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const key = paths.filter(Boolean).sort().join('|')
  const [urls, setUrls] = useState<Record<string, string>>(() => fromCache(paths))

  useEffect(() => {
    const wanted = key ? key.split('|') : []
    const now = Date.now()
    const missing = wanted.filter((p) => (cache.get(p)?.expires ?? 0) < now + 60_000)
    if (!missing.length) {
      setUrls(fromCache(wanted))
      return
    }
    let active = true
    supabase.storage
      .from('provas')
      .createSignedUrls(missing, TTL)
      .then(({ data }) => {
        data?.forEach((d) => {
          if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, expires: Date.now() + TTL * 1000 })
        })
        if (active) setUrls(fromCache(wanted))
      })
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
