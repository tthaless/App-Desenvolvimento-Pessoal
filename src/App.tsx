import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BookOpen, Camera, House, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { openedFromRecovery, supabase } from './lib/supabase'
import Auth from './components/Auth'
import Home from './components/Home'
import ReadingTab from './components/ReadingTab'
import Challenges from './components/Challenges'
import Profile from './components/Profile'
import ProfileSheet from './components/ProfileSheet'
import CameraFlow from './components/CameraFlow'
import NewPassword from './components/NewPassword'
import { useMembers, useOpenProfile } from './lib/members'
import { cleanupMyOldPhotos } from './lib/feed'
import { openCamera } from './lib/camera'
import { resetToday } from './lib/today'
import Avatar from './components/Avatar'
import NotificationsSheet from './components/NotificationsSheet'
import Welcome, { shouldShowWelcome } from './components/Welcome'
import { clearNavTarget, startNotifications, stopNotifications, useNavTarget } from './lib/notifications'

type Tab = 'inicio' | 'desafio' | 'leitura' | 'perfil'

const TABS: { id: Tab; label: string; Icon?: LucideIcon }[] = [
  { id: 'inicio', label: 'Início', Icon: House },
  { id: 'desafio', label: 'Desafio', Icon: Target },
  { id: 'leitura', label: 'Leitura', Icon: BookOpen },
  { id: 'perfil', label: 'Perfil' },
]

/** Splash do index.html: some quando o app termina de carregar. */
function hideBootSplash() {
  const el = document.getElementById('boot')
  if (!el) return
  el.classList.add('gone')
  setTimeout(() => el.remove(), 400)
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(openedFromRecovery)
  const [tab, setTab] = useState<Tab>('inicio')
  const [profileId, closeProfile] = useOpenProfile()
  const members = useMembers()
  const me = members.find((m) => m.id === session?.user.id)
  const [welcome, setWelcome] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Abriu o link de "esqueci minha senha" do e-mail.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') resetToday()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading) hideBootSplash()
  }, [loading])

  const sessionUserId = session?.user.id

  // Atalho "Postar prova" do ícone do app (segurar o ícone na tela inicial).
  useEffect(() => {
    if (!sessionUserId) return
    const params = new URLSearchParams(location.search)
    if (params.get('acao') === 'prova') {
      history.replaceState(null, '', '/')
      openCamera()
    }
  }, [sessionUserId])

  // Apaga do armazenamento as fotos (provas, desafio e feed) que já passaram de 24h.
  useEffect(() => {
    if (sessionUserId) cleanupMyOldPhotos(sessionUserId).catch(() => {})
  }, [sessionUserId])

  // Boas-vindas na primeira vez de cada pessoa neste aparelho.
  useEffect(() => {
    if (sessionUserId) setWelcome(shouldShowWelcome(sessionUserId))
  }, [sessionUserId])

  // Avisos de comentários, curtidas e "quero ler também".
  useEffect(() => {
    if (sessionUserId) startNotifications(sessionUserId)
    else stopNotifications()
  }, [sessionUserId])

  // Tocar num aviso leva para a aba certa; a própria aba abre o story, post ou lista.
  const navTarget = useNavTarget()
  useEffect(() => {
    if (!navTarget) return
    if (navTarget.type === 'story') setTab('inicio')
    if (navTarget.type === 'feed' || navTarget.type === 'library') setTab('leitura')
    if (navTarget.type === 'tab') {
      setTab(navTarget.tab)
      if (navTarget.tab === 'inicio') clearNavTarget()
    }
    if (navTarget.type === 'camera') {
      clearNavTarget()
      openCamera(navTarget.activity)
    }
    closeProfile()
  }, [navTarget, closeProfile])

  function go(next: Tab) {
    if (next === tab) window.scrollTo({ top: 0, behavior: 'smooth' })
    else {
      setTab(next)
      window.scrollTo(0, 0)
    }
  }

  if (loading) return null
  if (recovering && session) return <NewPassword onDone={() => setRecovering(false)} />
  if (!session) return <Auth />

  const userId = session.user.id

  const tabButton = (t: (typeof TABS)[number]) => (
    <button
      key={t.id}
      className={`tab ${tab === t.id ? 'active' : ''}`}
      onClick={() => go(t.id)}
      aria-current={tab === t.id ? 'page' : undefined}
    >
      {t.Icon ? (
        <t.Icon className="tab-icon" size={24} strokeWidth={tab === t.id ? 2.3 : 1.8} aria-hidden />
      ) : (
        <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="sm" className="tab-avatar" />
      )}
      <span className="tab-label">{t.label}</span>
    </button>
  )

  return (
    <div className="app" data-tab={tab}>
      <main className="content" key={tab}>
        {tab === 'inicio' && <Home userId={userId} />}
        {tab === 'desafio' && <Challenges userId={userId} />}
        {tab === 'leitura' && <ReadingTab userId={userId} />}
        {tab === 'perfil' && <Profile userId={userId} />}
      </main>
      <nav className="tabbar" aria-label="Navegação principal">
        {TABS.slice(0, 2).map(tabButton)}
        <div className="tab-camera-slot">
          <button className="tab-camera" onClick={() => openCamera()} aria-label="Postar prova">
            <Camera size={26} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        {TABS.slice(2).map(tabButton)}
      </nav>
      <CameraFlow userId={userId} />
      <NotificationsSheet />
      {welcome && <Welcome userId={userId} onClose={() => setWelcome(false)} onGoToProfile={() => setTab('perfil')} />}
      {profileId && <ProfileSheet userId={profileId} viewerId={userId} onClose={closeProfile} />}
    </div>
  )
}
