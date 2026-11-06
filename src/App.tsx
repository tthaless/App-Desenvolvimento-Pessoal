import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ActivityTab from './components/ActivityTab'
import Ranking from './components/Ranking'
import Profile from './components/Profile'

type Tab = 'exercicio' | 'leitura' | 'ranking' | 'perfil'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'exercicio', label: 'Exercício', icon: '💪' },
  { id: 'leitura', label: 'Leitura', icon: '📖' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('exercicio')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="splash">🔥</div>
  if (!session) return <Auth />

  const userId = session.user.id

  return (
    <div className="app" data-tab={tab}>
      <main className="content">
        {tab === 'exercicio' && <ActivityTab key="exercicio" activity="exercicio" userId={userId} />}
        {tab === 'leitura' && <ActivityTab key="leitura" activity="leitura" userId={userId} />}
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
    </div>
  )
}
