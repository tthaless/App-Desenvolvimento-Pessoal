import { useState } from 'react'
import { useMembers } from '../lib/members'
import { createPost } from '../lib/feed'
import Avatar from './Avatar'
import Composer from './Composer'
import FeedList from './FeedList'
import TopBar from './TopBar'

export default function Feed({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="feed">
      <TopBar title="Feed" />

      <section className="card new-post">
        <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="md" />
        <Composer
          placeholder="O que está rolando?"
          submitLabel="Postar"
          onSubmit={async (body, file) => {
            await createPost(userId, body, file)
            setRefreshKey((k) => k + 1)
          }}
        />
      </section>

      <FeedList userId={userId} emptyText="Nada no feed nas últimas 24h. Puxa o assunto!" refreshKey={refreshKey} />
    </div>
  )
}
