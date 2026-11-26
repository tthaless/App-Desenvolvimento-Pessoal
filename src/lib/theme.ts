import { useSyncExternalStore } from 'react'

/** Escolha da pessoa: claro, escuro ou seguir o celular. Fica guardada neste aparelho. */
export type ThemeChoice = 'claro' | 'escuro' | 'auto'

const KEY = 'streak:tema'
const COLORS = { light: '#f7f6e8', dark: '#121314' }
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'escuro' || v === 'auto' ? v : 'claro'
  } catch {
    return 'claro'
  }
}

let choice: ThemeChoice = readChoice()
const listeners = new Set<() => void>()

function isDark() {
  return choice === 'escuro' || (choice === 'auto' && !!media?.matches)
}

function apply() {
  const dark = isDark()
  const root = document.documentElement
  if (dark) root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  root.style.background = dark ? COLORS.dark : COLORS.light
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? COLORS.dark : COLORS.light)
  listeners.forEach((l) => l())
}

media?.addEventListener('change', () => choice === 'auto' && apply())
apply()

export function setTheme(next: ThemeChoice) {
  choice = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* sem armazenamento: vale só até fechar o app */
  }
  apply()
}

/** Inverte o que está na tela agora (botão rápido do topo). */
export function toggleTheme() {
  setTheme(isDark() ? 'claro' : 'escuro')
}

export function useTheme() {
  const dark = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    isDark,
  )
  return { choice, dark }
}
