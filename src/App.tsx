import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ActivityTab from './components/ActivityTab'
import Challenges from './components/Challenges'
import Feed from './components/Feed'
import Ranking from './components/Ranking'
import Profile from './components/Profile'
import ProfileSheet from './components/ProfileSheet'
import { useOpenProfile } from './lib/members'
import { cleanupMyFeedPhotos } from './lib/feed'

type Tab = 'exercicio' | 'leitura' | 'desafio' | 'feed' | 'ranking' | 'perfil'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'exercicio', label: 'Exercício', icon: '💪' },
  { id: 'leitura', label: 'Leitura', icon: '📖' },
  { id: 'desafio', label: 'Desafio', icon: '🎯' },
  { id: 'feed', label: 'Feed', icon: '💬' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('exercicio')
  const [profileId, closeProfile] = useOpenProfile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Apaga do armazenamento as fotos do feed que já passaram de 24h.
  const sessionUserId = session?.user.id
  useEffect(() => {
    if (sessionUserId) cleanupMyFeedPhotos(sessionUserId).catch(() => {})
  }, [sessionUserId])

  // Tocar no próprio nome leva para a aba Perfil.
  useEffect(() => {
    if (profileId && profileId === session?.user.id) {
      closeProfile()
      setTab('perfil')
    }
  }, [profileId, session, closeProfile])

  if (loading) return <div className="splash">🔥</div>
  if (!session) return <Auth />

  const userId = session.user.id

  return (
    <div className="app" data-tab={tab}>
      <main className="content">
        {tab === 'exercicio' && <ActivityTab key="exercicio" activity="exercicio" userId={userId} />}
        {tab === 'leitura' && <ActivityTab key="leitura" activity="leitura" userId={userId} />}
        {tab === 'desafio' && <Challenges userId={userId} />}
        {tab === 'feed' && <Feed userId={userId} />}
        {tab === 'ranking' && <Ranking userId={userId} />}
        {tab === 'perfil' && <Profile userId={userId} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
      {profileId && profileId !== userId && <ProfileSheet userId={profileId} viewerId={userId} onClose={closeProfile} />}
    </div>
  )
}
