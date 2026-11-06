import type { BookDraft } from './books'

interface Doc {
  title?: string
  author_name?: string[]
  cover_i?: number
}

/** Busca livros pelo título na Open Library (catálogo gratuito) para sugerir capa e autor. */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,cover_i`
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const json = (await res.json()) as { docs?: Doc[] }
  const seen = new Set<string>()
  const out: BookDraft[] = []
  for (const d of json.docs ?? []) {
    if (!d.title) continue
    const author = d.author_name?.[0] ?? ''
    const key = `${d.title.toLowerCase()}|${author.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      title: d.title.slice(0, 120),
      author: author.slice(0, 80),
      cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    })
    if (out.length === 5) break
  }
  // Os que têm capa primeiro.
  return out.sort((a, b) => Number(!!b.cover_url) - Number(!!a.cover_url))
}
