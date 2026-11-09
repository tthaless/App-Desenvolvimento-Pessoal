import type { BookDraft } from './books'

// Busca livros pelo título para sugerir capa e autor.
// Usa duas fontes gratuitas ao mesmo tempo: Google Livros (bom com edições brasileiras)
// e Open Library. Fica com o que tiver capa primeiro.

interface OlDoc {
  title?: string
  author_name?: string[]
  cover_i?: number
  number_of_pages_median?: number
}

interface GVolume {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    pageCount?: number
  }
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal })
    return res.ok ? ((await res.json()) as T) : null
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return null
  }
}

function googleCover(link?: string): string | null {
  if (!link) return null
  // Sempre https, sem a "dobra de página" que o Google desenha, e num tamanho bom.
  return link.replace(/^http:/, 'https:').replace('&edge=curl', '').replace(/zoom=\d/, 'zoom=1')
}

async function fromGoogle(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books&fields=items(volumeInfo(title,subtitle,authors,imageLinks,pageCount))`
  const json = await getJson<{ items?: GVolume[] }>(url, signal)
  return (json?.items ?? []).flatMap((v) => {
    const i = v.volumeInfo
    if (!i?.title) return []
    return [
      {
        title: i.title.slice(0, 120),
        author: (i.authors?.[0] ?? '').slice(0, 80),
        cover_url: googleCover(i.imageLinks?.thumbnail ?? i.imageLinks?.smallThumbnail),
        total_pages: i.pageCount && i.pageCount > 0 ? i.pageCount : null,
      },
    ]
  })
}

async function fromOpenLibrary(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,cover_i,number_of_pages_median`
  const json = await getJson<{ docs?: OlDoc[] }>(url, signal)
  return (json?.docs ?? []).flatMap((d) =>
    d.title
      ? [
          {
            title: d.title.slice(0, 120),
            author: (d.author_name?.[0] ?? '').slice(0, 80),
            cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
            total_pages: d.number_of_pages_median ?? null,
          },
        ]
      : [],
  )
}

export async function searchBooks(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const [google, ol] = await Promise.all([fromGoogle(query, signal), fromOpenLibrary(query, signal)])
  const byKey = new Map<string, BookDraft>()
  // Intercala as duas fontes pra manter os resultados mais relevantes de cada uma no topo.
  const mixed: BookDraft[] = []
  for (let i = 0; i < Math.max(google.length, ol.length); i++) {
    if (google[i]) mixed.push(google[i])
    if (ol[i]) mixed.push(ol[i])
  }
  for (const b of mixed) {
    const key = `${norm(b.title)}|${norm(b.author).split(' ')[0] ?? ''}`
    const prev = byKey.get(key)
    // Mesmo livro nas duas fontes: fica com o que tem capa.
    if (!prev) byKey.set(key, b)
    else byKey.set(key, { ...prev, cover_url: prev.cover_url ?? b.cover_url, total_pages: prev.total_pages ?? b.total_pages })
  }
  const out = [...byKey.values()].slice(0, 8)
  // Os que têm capa primeiro, mantendo a ordem de relevância entre eles.
  return out
    .map((b, i) => ({ b, i }))
    .sort((x, y) => Number(!!y.b.cover_url) - Number(!!x.b.cover_url) || x.i - y.i)
    .slice(0, 6)
    .map((x) => x.b)
}
