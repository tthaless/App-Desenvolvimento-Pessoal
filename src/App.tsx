import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ActivityTab from './components/ActivityTab'
import ReadingTab from './components/ReadingTab'
import Challenges from './components/Challenges'
import Feed from './components/Feed'
import Ranking from './components/Ranking'
import Profile from './components/Profile'
import ProfileSheet from './components/ProfileSheet'
import { useOpenProfile } from './lib/members'
import { cleanupMyFeedPhotos } from './lib/feed'
import { BookOpen, Dumbbell, MessageCircle, Target, Trophy, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Avatar from './components/Avatar'
import { PotionMark } from './components/Logo'
import { useMembers } from './lib/members'

type Tab = 'exercicio' | 'leitura' | 'desafio' | 'feed' | 'ranking' | 'perfil'

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'exercicio', label: 'Exercício', Icon: Dumbbell },
  { id: 'leitura', label: 'Leitura', Icon: BookOpen },
  { id: 'desafio', label: 'Desafio', Icon: Target },
  { id: 'feed', label: 'Feed', Icon: MessageCircle },
  { id: 'ranking', label: 'Ranking', Icon: Trophy },
  { id: 'perfil', label: 'Perfil', Icon: User },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('exercicio')
  const [profileId, closeProfile] = useOpenProfile()
  const members = useMembers()
  const me = members.find((m) => m.id === session?.user.id)

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

  if (loading)
    return (
      <div className="splash">
        <PotionMark size={64} />
      </div>
    )
  if (!session) return <Auth />

  const userId = session.user.id

  return (
    <div className="app" data-tab={tab}>
      <main className="content">
        {tab === 'exercicio' && <ActivityTab key="exercicio" activity="exercicio" userId={userId} />}
        {tab === 'leitura' && <ReadingTab userId={userId} />}
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
            {t.id === 'perfil' && me ? (
              <Avatar name={me.username} url={me.avatar_url} size="sm" className="tab-avatar" />
            ) : (
              <t.Icon className="tab-icon" size={24} strokeWidth={tab === t.id ? 2.4 : 1.8} aria-hidden />
            )}
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
      {profileId && profileId !== userId && <ProfileSheet userId={profileId} viewerId={userId} onClose={closeProfile} />}
    </div>
  )
}
