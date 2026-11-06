import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { replaceCover } from '../lib/covers'
import { refreshMembers } from '../lib/members'
import { errorMessage } from '../lib/utils'
import BookCover from './BookCover'

interface Props {
  table: 'books' | 'want_to_read'
  id: string
  userId: string
  url: string | null
  title: string
  size?: 'sm' | 'md' | 'lg'
  onChanged: () => void
}

/** Capa com um botãozinho de câmera pra trocar por uma foto do próprio livro. */
export default function CoverPicker({ table, id, userId, url, title, size = 'md', onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await replaceCover(table, id, userId, file, url)
      onChanged()
      if (table === 'books') refreshMembers().catch(() => {})
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <span className="cover-picker">
      <button type="button" className="cover-picker-btn" onClick={() => fileRef.current?.click()} disabled={busy} aria-label={`Trocar a capa de ${title}`}>
        <BookCover key={url ?? 'sem'} url={url} title={title} size={size} />
        <span className="cover-picker-badge">{busy ? '…' : <Camera size={size === 'sm' ? 11 : 13} aria-hidden />}</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <span className="cover-picker-error">{error}</span>}
    </span>
  )
}
