import { useEffect, useRef } from 'react'

/** Algum elemento rolável entre o toque e a janela ainda não está no topo? */
function scrolledDown(target: EventTarget | null, root: HTMLElement) {
  let el = target as HTMLElement | null
  while (el && el !== root.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true
    if (el === root) break
    el = el.parentElement
  }
  return false
}

/**
 * Fecha a janela ao arrastar pra baixo (como nos apps de celular).
 * Só começa a arrastar se o conteúdo já estiver no topo, pra não brigar com a rolagem.
 */
export function useDragToClose<T extends HTMLElement>(onClose: () => void, enabled = true) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let startY = 0
    let startT = 0
    let dy = 0
    let tracking = false
    let dragging = false

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || scrolledDown(e.target, el)) return
      tracking = true
      dragging = false
      startY = e.touches[0].clientY
      startT = performance.now()
      dy = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      dy = e.touches[0].clientY - startY
      if (!dragging) {
        if (dy > 8) {
          dragging = true
          el.style.transition = 'none'
        } else if (dy < -8) {
          tracking = false
          return
        } else return
      }
      e.preventDefault()
      el.style.transform = `translateY(${Math.max(0, dy)}px)`
    }
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      if (!dragging) return
      e.preventDefault()
      const speed = dy / Math.max(1, performance.now() - startT)
      el.style.transition = 'transform .22s cubic-bezier(.2, .8, .2, 1)'
      if (dy > 110 || speed > 0.6) {
        el.style.transform = 'translateY(100%)'
        setTimeout(() => closeRef.current(), 200)
      } else {
        el.style.transform = ''
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    el.addEventListener('touchcancel', onEnd, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])

  return ref
}
