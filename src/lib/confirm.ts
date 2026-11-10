import { useSyncExternalStore } from 'react'

export interface ConfirmOptions {
  title: string
  text?: string
  /** Texto do botão que confirma. */
  action: string
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Pergunta antes de apagar ou desfazer algo. Resolve com true se a pessoa confirmar. */
export function ask(options: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false)
  return new Promise((resolve) => {
    pending = { ...options, resolve }
    emit()
  })
}

export function answer(ok: boolean) {
  pending?.resolve(ok)
  pending = null
  emit()
}

export function useConfirm() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => pending,
  )
}
