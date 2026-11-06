import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMembers } from '../lib/members'
import type { StreakRow } from '../types'
import Avatar from './Avatar'
import Bookshelf from './Bookshelf'
import FeedList from './FeedList'
import ProfileDetails from './ProfileDetails'

interface Props {
  userId: string
  viewerId: string
  onClose: () => void
}

/** Perfil de outra pessoa, aberto ao tocar no nome ou na foto dela. */
export default function ProfileSheet({ userId, viewerId, onClose }: Props) {
  const member = useMembers().find((m) => m.id === userId)
  const [streaks, setStreaks] = useState<StreakRow[]>([])

  useEffect(() => {
    supabase.rpc('streaks').then(({ data }) => setStreaks(((data ?? []) as StreakRow[]).filter((r) => r.user_id === userId)))
  }, [userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!member) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet profile-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Perfil de ${member.username}`}>
        <span className="sheet-grip" aria-hidden />
        <div className="profile-top">
          <Avatar name={member.username} url={member.avatar_url} size="xl" />
          <p className="profile-name">{member.username}</p>
          {member.bio && <p className="profile-bio">{member.bio}</p>}
        </div>
        <ProfileDetails member={member} streaks={streaks} />
        <Bookshelf userId={userId} />
        <h2 className="section-title">Posts das últimas 24h</h2>
        <FeedList userId={viewerId} authorId={userId} emptyText={`${member.username} não postou nada no feed hoje.`} />
      </div>
    </div>
  )
}
