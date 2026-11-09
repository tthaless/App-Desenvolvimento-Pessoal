import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Member } from '../types'
import Badges from './Badges'
import Library from './Library'

interface Props {
  member: Member
  viewerId: string
  /** Conteúdo da aba Perfil. */
  children: ReactNode
}

type Sub = 'perfil' | 'estante' | 'insignias'

const SUBS: [Sub, string][] = [
  ['perfil', 'Perfil'],
  ['estante', 'Estante'],
  ['insignias', 'Insígnias'],
]

/** Abas do perfil (meu e dos amigos): Perfil, Estante e Insígnias. */
export default function ProfileTabs({ member, viewerId, children }: Props) {
  const [sub, setSub] = useState<Sub>('perfil')

  return (
    <>
      <nav className="subtabs three" aria-label="Seções do perfil">
        {SUBS.map(([id, label]) => (
          <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)} aria-current={sub === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>
      {sub === 'perfil' && children}
      {sub === 'estante' && <Library ownerId={member.id} viewerId={viewerId} />}
      {sub === 'insignias' && <Badges member={member} isMe={member.id === viewerId} />}
    </>
  )
}
