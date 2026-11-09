import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, ImageIcon, RefreshCw, SwitchCamera, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LONG_CACHE } from '../lib/signed'
import { closeCamera, notifyPosted, useCamera } from '../lib/camera'
import type { ProofKind } from '../lib/camera'
import { reloadToday, streakOf, useToday } from '../lib/today'
import { refreshMembers, useMembers } from '../lib/members'
import { compressImage, errorMessage } from '../lib/utils'
import ActivityIcon from './ActivityIcon'
import Celebration from './Celebration'
import type { Activity } from '../types'
import { haptic, toast } from '../lib/toast'

type Facing = 'environment' | 'user'
type CamStatus = 'starting' | 'live' | 'unavailable' | 'denied'

const DENIED_KEY = 'streak:camera-negada'

/** Tela cheia de nova prova: tira a foto, escolhe a atividade e posta. */
export default function CameraFlow({ userId }: { userId: string }) {
  const { open, preset } = useCamera()
  if (!open) return null
  return <Flow userId={userId} preset={preset} />
}

function Flow({ userId, preset }: { userId: string; preset: ProofKind | null }) {
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [celebrate, setCelebrate] = useState<{ from: number; to: number; unit: string; title: string; activity: Activity } | null>(null)

  // Voltar do Android (ou o gesto de voltar) fecha a câmera em vez de sair do app.
  useEffect(() => {
    history.pushState({ camera: true }, '')
    const onPop = () => closeCamera()
    window.addEventListener('popstate', onPop)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('popstate', onPop)
      document.body.classList.remove('no-scroll')
    }
  }, [])

  const close = useCallback(() => {
    if (history.state?.camera) history.back()
    else closeCamera()
  }, [])

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url)
    },
    [photo],
  )

  const endCelebration = useCallback(() => {
    setCelebrate(null)
    close()
  }, [close])

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label="Nova prova">
      {photo ? (
        <Review userId={userId} photo={photo} preset={preset} onRetake={() => setPhoto(null)} onClose={close} onPosted={setCelebrate} />
      ) : (
        <Capture onPhoto={(file) => setPhoto({ file, url: URL.createObjectURL(file) })} onClose={close} />
      )}
      {celebrate && <Celebration {...celebrate} onDone={endCelebration} />}
    </div>
  )
}

// ---------------- Câmera ----------------

function Capture({ onPhoto, onClose }: { onPhoto: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nativeRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [status, setStatus] = useState<CamStatus>(() => {
    if (!navigator.mediaDevices?.getUserMedia) return 'unavailable'
    try {
      if (localStorage.getItem(DENIED_KEY)) return 'denied'
    } catch {
      /* sem armazenamento: tenta a câmera mesmo assim */
    }
    return 'starting'
  })
  const [flash, setFlash] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (status === 'unavailable' || status === 'denied') return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        stop()
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.play().catch(() => {})
        }
        setStatus('live')
      })
      .catch((e: DOMException) => {
        if (cancelled) return
        const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
        if (denied) {
          try {
            localStorage.setItem(DENIED_KEY, '1')
          } catch {
            /* ignora */
          }
        }
        setStatus(denied ? 'denied' : 'unavailable')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, attempt])

  useEffect(() => stop, [stop])

  function shoot() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    // Salva exatamente o que aparece no visor: o centro da imagem em 3:4 (retrato).
    const vw = v.videoWidth
    const vh = v.videoHeight
    const ratio = 3 / 4
    const cw = vw / vh > ratio ? Math.round(vh * ratio) : vw
    const ch = vw / vh > ratio ? vh : Math.round(vw / ratio)
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, cw, ch)
    setFlash(true)
    haptic()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stop()
        onPhoto(new File([blob], `prova-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  function picked(file: File | undefined) {
    if (!file) return
    stop()
    onPhoto(file)
  }

  const live = status === 'live' || status === 'starting'

  return (
    <div className="cam-capture">
      <div className="cam-view">
        {live && (
          <div className="cam-frame">
            <video
              ref={videoRef}
              className={`cam-video ${facing === 'user' ? 'mirror' : ''} ${status === 'live' ? 'on' : ''}`}
              playsInline
              muted
              autoPlay
              aria-label="Visor da câmera"
            />
            {flash && <span className="cam-flash" onAnimationEnd={() => setFlash(false)} aria-hidden />}
          </div>
        )}
        {!live && (
          <div className="cam-fallback">
            <span className="cam-fallback-icon" aria-hidden>
              <Camera size={34} strokeWidth={1.6} />
            </span>
            <p className="cam-fallback-title">Tire a foto da sua prova</p>
            <p className="muted small">
              {status === 'denied'
                ? 'O acesso à câmera dentro do app está bloqueado. Dá pra usar a câmera do celular pelo botão abaixo.'
                : 'Abra a câmera do celular ou escolha uma foto da galeria.'}
            </p>
            <button className="btn primary big-btn" onClick={() => nativeRef.current?.click()}>
              <Camera size={20} aria-hidden /> Abrir câmera
            </button>
            <button className="btn ghost big-btn" onClick={() => galleryRef.current?.click()}>
              <ImageIcon size={20} aria-hidden /> Escolher da galeria
            </button>
            {status === 'denied' && (
              <button
                className="link-btn"
                onClick={() => {
                  try {
                    localStorage.removeItem(DENIED_KEY)
                  } catch {
                    /* ignora */
                  }
                  setStatus('starting')
                  setAttempt((n) => n + 1)
                }}
              >
                Tentar a câmera do app de novo
              </button>
            )}
          </div>
        )}
      </div>

      <header className="cam-top">
        <button className="cam-round" onClick={onClose} aria-label="Fechar câmera">
          <X size={22} aria-hidden />
        </button>
        <span className="cam-title">Nova prova</span>
        <span className="cam-round-spacer" aria-hidden />
      </header>

      {live && (
        <footer className="cam-controls">
          <button className="cam-round" onClick={() => galleryRef.current?.click()} aria-label="Escolher da galeria">
            <ImageIcon size={22} aria-hidden />
          </button>
          <button className="cam-shutter" onClick={shoot} disabled={status !== 'live'} aria-label="Tirar foto">
            <span aria-hidden />
          </button>
          <button
            className="cam-round"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="Virar câmera"
          >
            <SwitchCamera size={22} aria-hidden />
          </button>
        </footer>
      )}

      <input ref={nativeRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => picked(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => picked(e.target.files?.[0])} />
    </div>
  )
}

// ---------------- Escolher a atividade e postar ----------------

function Review({
  userId,
  photo,
  preset,
  onRetake,
  onClose,
  onPosted,
}: {
  userId: string
  photo: { file: File; url: string }
  preset: ProofKind | null
  onRetake: () => void
  onClose: () => void
  onPosted: (c: { from: number; to: number; unit: string; title: string; activity: Activity }) => void
}) {
  const today = useToday()
  const me = useMembers().find((m) => m.id === userId)
  const [kind, setKind] = useState<ProofKind | null>(preset)
  const [caption, setCaption] = useState('')
  const [page, setPage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = (['exercicio', 'leitura'] as const).map((a) => {
    const done = today.done[a].has(userId)
    return {
      kind: a,
      label: a === 'exercicio' ? 'Exercício' : 'Leitura',
      detail: done ? 'Feito hoje' : `${streakOf(today, userId, a)} dias seguidos`,
      done,
    }
  })
  const chosen = options.find((o) => o.kind === kind)

  const book = me?.current_book ? me : null
  const total = book?.current_book_total_pages ?? null
  const lastPage = book?.current_book_page ?? null
  const pageNum = page.trim() ? Number(page) : null
  const pageError =
    pageNum === null
      ? null
      : !Number.isInteger(pageNum) || pageNum < 1
        ? 'Digite o número da página.'
        : total && pageNum > total
          ? `O livro tem ${total} páginas.`
          : null

  async function send() {
    if (!chosen || pageError) return
    setSending(true)
    setError(null)
    try {
      const activity = chosen.kind
      const path = `${userId}/${activity}-${Date.now()}.jpg`
      const blob = await compressImage(photo.file)
      const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg', ...LONG_CACHE })
      if (up.error) throw up.error
      const row: Record<string, unknown> = { activity, photo_path: path, caption: caption.trim() || null }
      if (activity === 'leitura' && pageNum) row.page = pageNum
      let ins = await supabase.from('posts').insert(row)
      // Banco ainda sem a coluna de página: posta sem ela.
      if (ins.error && /page/.test(ins.error.message) && 'page' in row) {
        delete row.page
        ins = await supabase.from('posts').insert(row)
      }
      if (ins.error) {
        await supabase.storage.from('provas').remove([path])
        throw ins.error
      }
      const before = streakOf(today, userId, activity)
      const first = !chosen.done
      await reloadToday()
      if (activity === 'leitura' && pageNum) refreshMembers().catch(() => {})
      notifyPosted()
      if (first)
        onPosted({
          from: before,
          to: before + 1,
          unit: before + 1 === 1 ? 'dia seguido' : 'dias seguidos',
          title: activity === 'leitura' ? 'Leitura do dia feita!' : 'Treino do dia feito!',
          activity,
        })
      else {
        toast('Foto postada nos stories')
        onClose()
      }
    } catch (e) {
      setError(errorMessage(e))
      setSending(false)
    }
  }

  return (
    <div className="cam-review">
      <header className="cam-top solid">
        <button className="cam-round" onClick={onRetake} disabled={sending} aria-label="Tirar outra foto">
          <RefreshCw size={20} aria-hidden />
        </button>
        <span className="cam-title">Nova prova</span>
        <button className="cam-round" onClick={onClose} disabled={sending} aria-label="Cancelar">
          <X size={22} aria-hidden />
        </button>
      </header>

      <div className="cam-photo">
        <img src={photo.url} alt="Foto da prova" />
      </div>

      <section className="cam-panel" aria-label="Escolher atividade">
        <p className="cam-question" id="cam-question">
          Essa prova é de quê?
        </p>
        <div className="cam-options" role="radiogroup" aria-labelledby="cam-question">
          {options.map((o) => (
            <button
              key={o.kind}
              role="radio"
              aria-checked={kind === o.kind}
              className={`cam-option act-${o.kind} ${kind === o.kind ? 'on' : ''} ${o.done ? 'done' : ''}`}
              onClick={() => setKind(o.kind)}
              disabled={sending || !today.loaded}
            >
              <span className="cam-option-icon">
                {o.done ? <Check size={20} strokeWidth={3} aria-hidden /> : <ActivityIcon activity={o.kind} size={20} />}
              </span>
              <span className="cam-option-label">{o.label}</span>
              <span className="cam-option-detail">{o.detail}</span>
            </button>
          ))}
        </div>

        {kind === 'leitura' && book && (
          <label className="cam-page">
            <span>
              Página em que parou <span className="muted">(opcional)</span>
            </span>
            <span className="cam-page-row">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={total ?? undefined}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                placeholder={lastPage ? String(lastPage) : 'ex: 42'}
                aria-describedby={pageError ? 'cam-page-hint' : undefined}
              />
              {total && <span className="cam-page-total">de {total}</span>}
            </span>
            {pageError && (
              <span id="cam-page-hint" className="cam-page-hint error">
                {pageError}
              </span>
            )}
          </label>
        )}

        {chosen && (
          <input
            className="cam-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={kind === 'leitura' ? 'Legenda (opcional)' : 'Qual foi o treino? (opcional)'}
            maxLength={140}
            aria-label="Legenda"
          />
        )}
        {chosen?.done && <p className="cam-note">Você já postou essa hoje. A foto vai pros stories, mas não soma pontos de novo.</p>}
        {error && <p className="msg error">{error}</p>}

        <button className="btn primary big-btn" onClick={send} disabled={!chosen || !!pageError || sending}>
          {sending ? 'Enviando…' : chosen ? `Postar prova de ${chosen.label.toLowerCase()}` : 'Escolha a atividade'}
        </button>
      </section>
    </div>
  )
}
