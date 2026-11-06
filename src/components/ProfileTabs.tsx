import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Member } from '../types'
import Library from './Library'

interface Props {
  member: Member
  viewerId: string
  /** Conteúdo da aba Perfil. */
  children: ReactNode
}

/** Abas do perfil (meu e dos amigos): Perfil e Estante (a biblioteca da pessoa). */
export default function ProfileTabs({ member, viewerId, children }: Props) {
  const [sub, setSub] = useState<'perfil' | 'estante'>('perfil')

  return (
    <>
      <nav className="subtabs" aria-label="Seções do perfil">
        <button className={sub === 'perfil' ? 'on' : ''} onClick={() => setSub('perfil')} aria-current={sub === 'perfil' ? 'page' : undefined}>
          Perfil
        </button>
        <button className={sub === 'estante' ? 'on' : ''} onClick={() => setSub('estante')} aria-current={sub === 'estante' ? 'page' : undefined}>
          Estante
        </button>
      </nav>
      {sub === 'perfil' ? children : <Library ownerId={member.id} viewerId={viewerId} />}
    </>
  )
}
