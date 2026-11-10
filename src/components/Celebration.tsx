import { useEffect, useState } from 'react'
import ActivityIcon from './ActivityIcon'
import type { Activity } from '../types'

interface Props {
  from: number
  to: number
  /** Texto abaixo do número, como "dias seguidos". */
  unit: string
  title: string
  /** Símbolo que aparece no centro: halter ou livro. */
  activity: Activity
  onDone: () => void
}

const SPARKS = 10

/** Comemoração ao postar a prova: símbolo da atividade, número subindo e vibração. */
export default function Celebration({ from, to, unit, title, activity, onDone }: Props) {
  const [value, setValue] = useState(from)

  useEffect(() => {
    navigator.vibrate?.([25, 40, 60])
    const start = performance.now()
    const delay = 350
    const duration = 650
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start - delay) / duration))
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const done = setTimeout(onDone, 2600)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [from, to, onDone])

  return (
    <div className="celebration" onClick={onDone} role="status" aria-live="polite">
      <div className="celebration-body">
        <span className="celebration-flame">
          {Array.from({ length: SPARKS }, (_, i) => (
            <span key={i} className="spark" style={{ ['--a' as string]: `${(360 / SPARKS) * i}deg`, ['--d' as string]: `${i * 25}ms` }} />
          ))}
          <span className={`celebration-icon act-${activity}`}>
            <ActivityIcon activity={activity} size={56} strokeWidth={2} />
          </span>
        </span>
        <span className="celebration-number">{value}</span>
        <span className="celebration-unit">{unit}</span>
        <span className="celebration-title">{title}</span>
      </div>
    </div>
  )
}
