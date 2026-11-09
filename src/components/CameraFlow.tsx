import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, ImageIcon, RefreshCw, SwitchCamera, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LONG_CACHE } from '../lib/signed'
import { checkin } from '../lib/challenges'
import { closeCamera, notifyPosted, useCamera } from '../lib/camera'
import type { ProofKind } from '../lib/camera'
import { challengeDaysOf, reloadToday, streakOf, useToday } from '../lib/today'
import { useMembers } from '../lib/members'
import { compressImage, errorMessage } from '../lib/utils'
import ActivityIcon from './ActivityIcon'
import Celebration from './Celebration'

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
  const [celebrate, setCelebrate] = useState<{ from: number; to: number; unit: string; title: string } | null>(null)

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
    navigator.vibrate?.(15)
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

interface Option {
  kind: ProofKind
  label: string
  detail: string
  done: boolean
  /** Desafio já cumprido hoje não aceita outra foto. */
  locked: boolean
}

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
  onPosted: (c: { from: number; to: number; unit: string; title: string }) => void
}) {
  const today = useToday()
  const me = useMembers().find((m) => m.id === userId)
  const [kind, setKind] = useState<ProofKind | null>(preset)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const challengeDays = challengeDaysOf(today, userId)
  const challengeDone = challengeDays.has(today.day)
  const options: Option[] = [
    {
      kind: 'exercicio',
      label: 'Exercício',
      detail: today.done.exercicio.has(userId) ? 'Feito hoje' : `${streakOf(today, userId, 'exercicio')} dias seguidos`,
      done: today.done.exercicio.has(userId),
      locked: false,
    },
    {
      kind: 'leitura',
      label: 'Leitura',
      detail: today.done.leitura.has(userId) ? 'Feito hoje' : `${streakOf(today, userId, 'leitura')} dias seguidos`,
      done: today.done.leitura.has(userId),
      locked: false,
    },
  ]
  if (today.challenge)
    options.push({
      kind: 'desafio',
      label: 'Desafio',
      detail: challengeDone ? 'Cumprido hoje' : `${challengeDays.size} de 7 na semana`,
      done: challengeDone,
      locked: challengeDone,
    })

  const chosen = options.find((o) => o.kind === kind)

  async function send() {
    if (!chosen || chosen.locked) return
    setSending(true)
    setError(null)
    try {
      if (chosen.kind === 'desafio') {
        await checkin(userId, today.challenge!.id, photo.file)
        const before = challengeDays.size
        const to = before + 1
        await reloadToday()
        notifyPosted()
        onPosted({
          from: before,
          to,
          unit: 'de 7 no desafio',
          title: to >= 7 ? 'Semana completa! +40' : to === 5 ? '+30 pontos garantidos!' : 'Desafio do dia cumprido!',
        })
      } else {
        const activity = chosen.kind
        const path = `${userId}/${activity}-${Date.now()}.jpg`
        const blob = await compressImage(photo.file)
        const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg', ...LONG_CACHE })
        if (up.error) throw up.error
        const ins = await supabase.from('posts').insert({ activity, photo_path: path, caption: caption.trim() || null })
        if (ins.error) {
          await supabase.storage.from('provas').remove([path])
          throw ins.error
        }
        const before = streakOf(today, userId, activity)
        const first = !chosen.done
        await reloadToday()
        notifyPosted()
        if (first)
          onPosted({
            from: before,
            to: before + 1,
            unit: before + 1 === 1 ? 'dia seguido' : 'dias seguidos',
            title: activity === 'leitura' ? 'Leitura do dia feita!' : 'Treino do dia feito!',
          })
        else onClose()
      }
    } catch (e) {
      setError(errorMessage(e))
      setSending(false)
    }
  }

  const placeholder =
    kind === 'leitura' ? (me?.current_book ? `Quantas páginas de ${me.current_book}?` : 'O que você está lendo?') : 'Qual foi o treino?'

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
        <div className={`cam-options n${options.length}`} role="radiogroup" aria-labelledby="cam-question">
          {options.map((o) => (
            <button
              key={o.kind}
              role="radio"
              aria-checked={kind === o.kind}
              className={`cam-option act-${o.kind} ${kind === o.kind ? 'on' : ''} ${o.done ? 'done' : ''}`}
              onClick={() => !o.locked && setKind(o.kind)}
              disabled={o.locked || sending || !today.loaded}
            >
              <span className="cam-option-icon">
                {o.done ? <Check size={20} strokeWidth={3} aria-hidden /> : <ActivityIcon activity={o.kind} size={20} />}
              </span>
              <span className="cam-option-label">{o.label}</span>
              <span className="cam-option-detail">{o.detail}</span>
            </button>
          ))}
        </div>

        {chosen && chosen.kind !== 'desafio' && (
          <input
            className="cam-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={placeholder}
            maxLength={140}
            aria-label="Legenda"
          />
        )}
        {chosen?.kind === 'desafio' && today.challenge && <p className="cam-note">{today.challenge.title}</p>}
        {chosen?.done && !chosen.locked && (
          <p className="cam-note">Você já postou essa hoje. A foto vai pros stories, mas não soma pontos de novo.</p>
        )}
        {error && <p className="msg error">{error}</p>}

        <button className="btn primary big-btn" onClick={send} disabled={!chosen || chosen.locked || sending}>
          {sending ? 'Enviando…' : chosen ? `Postar prova de ${chosen.label.toLowerCase()}` : 'Escolha a atividade'}
        </button>
      </section>
    </div>
  )
}
