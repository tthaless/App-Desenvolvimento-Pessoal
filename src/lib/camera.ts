import { useSyncExternalStore } from 'react'
import type { StoryItem } from '../types'

/** Atividade de uma prova: exercício, leitura ou o desafio da semana. */
export type ProofKind = StoryItem['activity']

interface State {
  open: boolean
  /** Atividade já escolhida ao abrir (pelo desafio, pelo cartão do dia ou por um aviso). */
  preset: ProofKind | null
  /** Sobe a cada prova enviada, pra as telas recarregarem. */
  posted: number
}

let state: State = { open: false, preset: null, posted: 0 }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function openCamera(preset: ProofKind | null = null) {
  set({ open: true, preset })
}

export function closeCamera() {
  set({ open: false, preset: null })
}

export function notifyPosted() {
  set({ posted: state.posted + 1 })
}

export function useCamera(): State {
  return useSyncExternalStore(subscribe, () => state)
}
