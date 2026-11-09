import { useState } from 'react'
import { createPost } from '../lib/feed'
import { useMembers } from '../lib/members'
import Avatar from './Avatar'
import Composer from './Composer'
import { ImagePlus, MessageCircle } from 'lucide-react'
import { toast } from '../lib/toast'
import EmptyState from './EmptyState'
import FeedList from './FeedList'

/** Feed do grupo: post novo e os posts das últimas 24h. */
export default function FeedSection({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [refreshKey, setRefreshKey] = useState(0)
  const [writing, setWriting] = useState(false)

  return (
    <section className="section feed" aria-labelledby="feed-title">
      <div className="section-head">
        <h2 id="feed-title" className="section-heading">
          Feed
        </h2>
      </div>
      {writing ? (
        <section className="card new-post">
          <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="md" />
          <Composer
            autoFocus
            placeholder="O que está rolando?"
            submitLabel="Postar"
            onSubmit={async (body, file) => {
              await createPost(userId, body, file)
              setRefreshKey((k) => k + 1)
              setWriting(false)
              toast('Postado no feed')
            }}
          />
        </section>
      ) : (
        <button className="new-post-closed" onClick={() => setWriting(true)}>
          <Avatar name={me?.username ?? '?'} url={me?.avatar_url} size="sm" />
          <span>O que está rolando?</span>
          <ImagePlus size={19} aria-hidden />
        </button>
      )}
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
