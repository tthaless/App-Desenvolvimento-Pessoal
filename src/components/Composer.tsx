import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/utils'

interface Props {
  placeholder: string
  submitLabel: string
  onSubmit: (body: string, file: File | null) => Promise<void>
  autoFocus?: boolean
}

const MAX = 280

/** Caixa de texto com uma foto opcional, usada para posts e comentários. */
export default function Composer({ placeholder, submitLabel, onSubmit, autoFocus }: Props) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // Cresce conforme o texto.
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  function pick(f: File | undefined) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearPhoto() {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    const text = body.trim()
    if (!text && !file) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(text, file)
      setBody('')
      clearPhoto()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const left = MAX - body.length
  const canSend = (body.trim().length > 0 || !!file) && left >= 0 && !busy

  return (
    <div className="composer">
      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={1}
        maxLength={MAX}
        autoFocus={autoFocus}
      />
      {preview && (
        <div className="composer-photo">
          <img src={preview} alt="Foto anexada" />
          <button type="button" onClick={clearPhoto} aria-label="Remover foto">
            ✕
          </button>
        </div>
      )}
      {error && <p className="msg error">{error}</p>}
      <div className="composer-bar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileRef.current?.click()}
          disabled={!!file || busy}
          aria-label="Anexar foto"
          title={file ? 'Só uma foto por vez' : 'Anexar foto'}
        >
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {body.length > MAX - 40 && <span className={`counter ${left < 0 ? 'over' : ''}`}>{left}</span>}
        <button type="button" className="btn primary small-btn" disabled={!canSend} onClick={submit}>
          {busy ? 'Enviando…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
