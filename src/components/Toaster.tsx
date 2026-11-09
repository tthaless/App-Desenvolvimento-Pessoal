import { useEffect, useState } from 'react'
import { AlertCircle, Check, Info, WifiOff } from 'lucide-react'
import { dismissToast, toast, useToasts } from '../lib/toast'

/** Avisos rápidos e o aviso de "sem conexão", acima da barra de baixo. */
export default function Toaster({ onReconnect }: { onReconnect?: () => void }) {
  const items = useToasts()
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)

  useEffect(() => {
    const down = () => setOffline(true)
    const up = () => {
      setOffline(false)
      toast('Conectado de novo', 'info')
      onReconnect?.()
    }
    window.addEventListener('offline', down)
    window.addEventListener('online', up)
    return () => {
      window.removeEventListener('offline', down)
      window.removeEventListener('online', up)
    }
  }, [onReconnect])

  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {offline && (
        <div className="toast offline" role="status">
          <WifiOff size={17} aria-hidden />
          <span>Sem conexão. Assim que a internet voltar, o app atualiza sozinho.</span>
        </div>
      )}
      {items.map((t) => (
        <button key={t.id} className={`toast ${t.tone}`} onClick={() => dismissToast(t.id)} role={t.tone === 'error' ? 'alert' : 'status'}>
          {t.tone === 'ok' ? <Check size={17} strokeWidth={3} aria-hidden /> : t.tone === 'error' ? <AlertCircle size={17} aria-hidden /> : <Info size={17} aria-hidden />}
          <span>{t.text}</span>
        </button>
      ))}
    </div>
  )
}
