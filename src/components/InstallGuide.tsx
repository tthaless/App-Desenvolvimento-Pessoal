import { useEffect, useState } from 'react'
import { Check, Download, EllipsisVertical, Share, SquarePlus } from 'lucide-react'

type Platform = 'ios' | 'android'

// Evento do Chrome/Android que permite instalar com um toque.
interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/i.test(ua) || iPadOS ? 'ios' : 'android'
}

function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Passo a passo pra colocar o site na tela inicial e usar como app. */
export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>(detectPlatform)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(isInstalled)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function installNow() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const steps =
    platform === 'ios'
      ? [
          <>Abra este site no <strong>Safari</strong> (é o caminho que funciona em qualquer iPhone).</>,
          <>
            Toque em <strong>Compartilhar</strong> <Share size={15} className="inline-icon" aria-label="ícone de compartilhar" /> na barra de
            baixo.
          </>,
          <>
            Role e toque em <strong>Adicionar à Tela de Início</strong> <SquarePlus size={15} className="inline-icon" aria-hidden />.
          </>,
          <>Toque em <strong>Adicionar</strong>. O ícone do Streak aparece junto com os seus apps.</>,
        ]
      : [
          <>Abra este site no <strong>Chrome</strong>.</>,
          <>
            Toque no menu <EllipsisVertical size={15} className="inline-icon" aria-label="três pontinhos" /> no canto de cima.
          </>,
          <>
            Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
          </>,
          <>Confirme. O Streak abre em tela cheia, igual a um app.</>,
        ]

  return (
    <details className="card install-guide">
      <summary>
        <Download size={18} aria-hidden />
        <span>
          <strong>Instalar como app</strong>
          <span className="muted small">Ícone na tela inicial, sem barra do navegador</span>
        </span>
      </summary>

      <div className="segmented install-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={platform === 'ios'} className={platform === 'ios' ? 'on' : ''} onClick={() => setPlatform('ios')}>
          iPhone
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'android'}
          className={platform === 'android' ? 'on' : ''}
          onClick={() => setPlatform('android')}
        >
          Android
        </button>
      </div>

      {platform === 'android' && prompt && (
        <button type="button" className="btn primary install-now" onClick={installNow}>
          <Download size={17} aria-hidden /> Instalar agora
        </button>
      )}

      <ol className="install-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="install-num">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="muted small install-note">
        <Check size={14} aria-hidden /> Pronto: é só abrir pelo ícone. As novidades chegam sozinhas, sem precisar atualizar.
      </p>
    </details>
  )
}
