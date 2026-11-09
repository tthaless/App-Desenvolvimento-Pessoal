import { useSyncExternalStore } from 'react'

export type ToastTone = 'ok' | 'info' | 'error'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

let toasts: Toast[] = []
let next = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Aviso rápido na parte de baixo da tela ("Salvo", "Postado"...). Some sozinho. */
export function toast(text: string, tone: ToastTone = 'ok', ms = 2600) {
  const id = next++
  // No máximo dois de cada vez: o mais antigo sai.
  toasts = [...toasts.slice(-1), { id, text, tone }]
  emit()
  setTimeout(() => dismissToast(id), ms)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )
}

/** Vibração curta ao tocar (só onde o celular deixa: Android). */
export function haptic(kind: 'tap' | 'success' | 'warn' = 'tap') {
  const pattern = kind === 'tap' ? 8 : kind === 'success' ? [12, 40, 18] : [30, 50, 30]
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* sem vibração */
  }
}
