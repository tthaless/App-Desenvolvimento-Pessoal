import { useState } from 'react'
import { createPost } from '../lib/feed'
import { useMembers } from '../lib/members'
import Avatar from './Avatar'
import Composer from './Composer'
import { MessageCircle } from 'lucide-react'
import { toast } from '../lib/toast'
import EmptyState from './EmptyState'
import FeedList from './FeedList'

/** Feed do grupo: post novo e os posts das últimas 24h. */
export default function FeedSection({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <section className="section feed" aria-labelledby="feed-title">
      <div className="section-head">
        <h2 id="feed-title" className="section-heading">
          Feed
        </h2>
      </div>
      <section className="card new-post">
        <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="md" />
        <Composer
          placeholder="O que está rolando?"
          submitLabel="Postar"
          onSubmit={async (body, file) => {
            await createPost(userId, body, file)
            setRefreshKey((k) => k + 1)
            toast('Postado no feed')
          }}
        />
      </section>
      <FeedList
        userId={userId}
        emptyText="Nada no feed nas últimas 24h."
        refreshKey={refreshKey}
        empty={
          <EmptyState
            icon={<MessageCircle size={28} />}
            title="O feed está quieto"
            text="Conte como foi o treino, peça indicação de livro ou cobre quem sumiu. Os posts somem em 24h."
          />
        }
      />
    </section>
  )
}
