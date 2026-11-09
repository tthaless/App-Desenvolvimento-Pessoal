import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useMembers } from '../lib/members'
import type { StreakRow } from '../types'
import Avatar from './Avatar'
import ProfileHero from './ProfileHero'
import ProfileStats from './ProfileStats'
import FeedList from './FeedList'
import ProfileDetails from './ProfileDetails'
import ProfileTabs from './ProfileTabs'
import { FeaturedBadges } from './Badges'
import { useDragToClose } from '../lib/useDragToClose'

// Um "visitante" que não é ninguém do grupo: assim nada aparece como se fosse seu.
const VISITOR = '00000000-0000-0000-0000-000000000000'
// No modo "como o grupo vê" só dá pra navegar e olhar.
const ALLOWED_IN_PREVIEW = '.subtabs button, .badge-cell, .featured-badges button, .badge-sheet, .shelf-item, .pdf-chip, .pdf-viewer, .month-day, .want-others, .viewer-close'

interface Props {
  userId: string
  viewerId: string
  onClose: () => void
}

/** Perfil de outra pessoa, aberto ao tocar no nome ou na foto dela. */
export default function ProfileSheet({ userId, viewerId, onClose }: Props) {
  const member = useMembers().find((m) => m.id === userId)
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const sheetRef = useDragToClose<HTMLDivElement>(onClose, !!member)

  useEffect(() => {
    supabase.rpc('streaks').then(({ data }) => setStreaks(((data ?? []) as StreakRow[]).filter((r) => r.user_id === userId)))
  }, [userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!member) return null

  // Abrindo o próprio perfil: mostra exatamente como um amigo vê (sem botões de dono)
  // e sem deixar fazer nada além de olhar.
  const isSelf = userId === viewerId
  const asViewer = isSelf ? VISITOR : viewerId

  function blockActions(e: MouseEvent<HTMLDivElement>) {
    if (!isSelf) return
    const el = e.target as HTMLElement
    if (el.closest(ALLOWED_IN_PREVIEW)) return
    if (el.closest('button, a, input, label, textarea, select')) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={`sheet profile-sheet ${isSelf ? 'profile-preview' : ''}`}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onClickCapture={blockActions}
        role="dialog"
        aria-label={isSelf ? 'Seu perfil como o grupo vê' : `Perfil de ${member.username}`}
      >
        <span className="sheet-grip" aria-hidden />
        {isSelf && (
          <p className="preview-note">
            <Eye size={14} aria-hidden /> É assim que o grupo vê o seu perfil
          </p>
        )}
        <ProfileHero
          coverUrl={member.cover_url}
          avatar={<Avatar name={member.username} url={member.avatar_url} size="xl" />}
          name={member.username}
          badges={<FeaturedBadges member={member} />}
          bio={member.bio && <p className="profile-bio">{member.bio}</p>}
          stats={<ProfileStats userId={member.id} />}
        />
        <ProfileTabs member={member} viewerId={asViewer}>
          <ProfileDetails member={member} streaks={streaks} />
          <h2 className="section-title">Posts das últimas 24h</h2>
          <FeedList userId={asViewer} authorId={userId} emptyText={`${member.username} não postou nada no feed hoje.`} />
        </ProfileTabs>
      </div>
    </div>
  )
}
