import { useState } from 'react'

// Cores das capas geradas pra livros sem capa (escolhida pelo título, sempre a mesma).
const PALETTE = [
  ['#2f7a68', '#174a40'],
  ['#a33b3b', '#5a1717'],
  ['#3b4fa3', '#1c2559'],
  ['#5b3b7a', '#2c1a40'],
  ['#b8902f', '#6b4d10'],
  ['#c0632a', '#6e2f0c'],
  ['#3a8ab0', '#174560'],
  ['#444b57', '#1d2128'],
]

function paletteOf(title: string) {
  let h = 0
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'fill'

/** Capa do livro. Sem capa (ou se não carregar): nas pequenas, a inicial; nas grandes, uma capa com título e autor. */
export default function BookCover({ url, title, author, size = 'md' }: { url: string | null; title: string; author?: string | null; size?: Size }) {
  const [failed, setFailed] = useState(false)
  const big = size === 'xl' || size === 'fill'
  if (url && !failed)
    return (
      <span className={`cover ${size}`}>
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    )
  if (!big)
    return (
      <span className={`cover ${size}`}>
        <span className="cover-blank" aria-hidden>
          {title.slice(0, 1).toUpperCase()}
        </span>
      </span>
    )
  const [a, b] = paletteOf(title)
  return (
    <span className={`cover ${size} cover-made`} style={{ background: `linear-gradient(160deg, ${a}, ${b})` }} aria-hidden>
      <span className="cover-made-title">{title}</span>
      {author && <span className="cover-made-author">{author}</span>}
    </span>
  )
}
