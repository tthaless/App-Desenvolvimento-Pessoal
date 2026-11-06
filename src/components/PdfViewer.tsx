import { useEffect, useRef, useState } from 'react'
import { attachmentUrl, loadPdfjs } from '../lib/pdf'

/** Abre o PDF dentro do app, página por página, sem precisar baixar. */
export default function PdfViewer({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const pagesRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [pages, setPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | undefined
    ;(async () => {
      try {
        const [pdfjs, url] = await Promise.all([loadPdfjs(), attachmentUrl(path)])
        const doc = await pdfjs.getDocument({ url }).promise
        destroy = () => doc.destroy()
        if (cancelled) return
        setPages(doc.numPages)
        setStatus('ok')
        const box = pagesRef.current
        if (!box) return
        const width = box.clientWidth
        const ratio = window.devicePixelRatio || 1
        for (let n = 1; n <= doc.numPages && !cancelled; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${width}px`
          canvas.className = 'pdf-page'
          box.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      destroy?.()
    }
  }, [path])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pdf-viewer" role="dialog" aria-label={`Anotações de ${title}`}>
      <header className="pdf-head">
        <div className="pdf-head-text">
          <strong>📄 {title}</strong>
          {pages > 0 && (
            <span className="muted small">
              {pages} {pages === 1 ? 'página' : 'páginas'}
            </span>
          )}
        </div>
        <button className="viewer-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </header>
      <div className="pdf-body">
        {status === 'loading' && <p className="muted center empty">Abrindo PDF…</p>}
        {status === 'error' && <p className="msg error">Não foi possível abrir o PDF. Ele pode ter sido apagado ou ficado privado.</p>}
        <div ref={pagesRef} className="pdf-pages" />
      </div>
    </div>
  )
}
