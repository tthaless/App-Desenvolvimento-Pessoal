import { supabase } from './supabase'

// Notificações no celular com o app fechado (Web Push).
// A chave abaixo é pública (identifica o Streak para o serviço de avisos do celular).
const VAPID_PUBLIC_KEY = 'BGHNZuiWtkDZ9Puu1URXEfXf6g6GmcEBPTHZvD94FTJmK4uDsQ7_fOdrpyCGUp5kMczEpAJbpcZVyVY7xDSl3TE'

export interface PushPrefs {
  reminder: boolean
  last_one: boolean
  comments: boolean
  social: boolean
}

export const DEFAULT_PREFS: PushPrefs = { reminder: true, last_one: true, comments: true, social: true }

export type PushSupport = 'ok' | 'ios-install' | 'unsupported'

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** No iPhone, só funciona com o app instalado na tela inicial (iOS 16.4+). */
export function pushSupport(): PushSupport {
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIOS() && !isStandalone()) return 'ios-install'
  return hasApi ? 'ok' : 'unsupported'
}

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration()
  return existing ?? (await navigator.serviceWorker.register('/sw.js'))
}

/** Este aparelho já está recebendo? */
export async function isSubscribed(): Promise<boolean> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return !!(await reg?.pushManager.getSubscription())
}

/** Pede permissão e cadastra este aparelho. */
export async function enablePush(): Promise<void> {
  if (pushSupport() !== 'ok') throw new Error('Este navegador não recebe notificações.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw new Error('As notificações foram bloqueadas. Libere nas configurações do navegador (ou do iPhone) e tente de novo.')
  const reg = await registration()
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  // Se o aparelho já estava cadastrado (por exemplo, com outra conta), troca.
  await supabase.from('push_subscriptions').delete().eq('endpoint', json.endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
  if (error?.code === '23505') throw new Error('Este aparelho já recebe os avisos de outra conta do Streak.')
  if (error) throw error
}

/** Para de receber neste aparelho. */
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe().catch(() => {})
  }
}

export async function loadPrefs(): Promise<PushPrefs> {
  const { data } = await supabase.from('push_prefs').select('reminder,last_one,comments,social').maybeSingle()
  return { ...DEFAULT_PREFS, ...((data as Partial<PushPrefs> | null) ?? {}) }
}

export async function savePrefs(prefs: PushPrefs) {
  const { error } = await supabase.from('push_prefs').upsert(prefs)
  if (error) throw error
}

const ASKED_KEY = 'streak:push-perguntou'

/** Mostrar o convite depois da primeira prova? Só uma vez por aparelho. */
export function shouldOfferPush(): boolean {
  try {
    if (localStorage.getItem(ASKED_KEY)) return false
  } catch {
    return false
  }
  return pushSupport() === 'ok' && Notification.permission === 'default'
}

export function markPushOffered() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* tudo bem */
  }
}
