import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Member } from '../types'
import Bookshelf from './Bookshelf'
import CurrentBook from './CurrentBook'

interface Props {
  member: Member
  viewerId: string
  /** Conteúdo da aba Perfil. */
  children: ReactNode
}

/** Abas do perfil (meu e dos amigos): Perfil e Estante. */
export default function ProfileTabs({ member, viewerId, children }: Props) {
  const [sub, setSub] = useState<'perfil' | 'estante'>('perfil')
  const [shelfKey, setShelfKey] = useState(0)
  const isMe = member.id === viewerId

  return (
    <>
      <nav className="subtabs" aria-label="Seções do perfil">
        <button className={sub === 'perfil' ? 'on' : ''} onClick={() => setSub('perfil')} aria-current={sub === 'perfil' ? 'page' : undefined}>
          👤 Perfil
        </button>
        <button className={sub === 'estante' ? 'on' : ''} onClick={() => setSub('estante')} aria-current={sub === 'estante' ? 'page' : undefined}>
          📚 Estante
        </button>
      </nav>

      {sub === 'perfil' ? (
        children
      ) : (
        <>
          {isMe ? (
            <CurrentBook userId={member.id} onShelfChanged={() => setShelfKey((k) => k + 1)} />
          ) : (
            member.current_book && (
              <section className="card current-book act-leitura">
                <p className="muted small">📖 Lendo agora</p>
                <p className="book-title">{member.current_book}</p>
              </section>
            )
          )}
          <Bookshelf userId={member.id} refreshKey={shelfKey} />
        </>
      )}
    </>
  )
}
