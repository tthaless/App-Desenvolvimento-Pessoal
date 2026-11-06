import { useState } from 'react'

/** Capa do livro; sem capa (ou se não carregar), mostra uma lombada com a inicial. */
export default function BookCover({ url, title, size = 'md' }: { url: string | null; title: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={`cover ${size}`}>
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="cover-blank" aria-hidden>
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  )
}
