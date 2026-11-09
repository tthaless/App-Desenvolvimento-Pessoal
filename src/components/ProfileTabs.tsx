import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Member } from '../types'
import { clearNavTarget, useNavTarget } from '../lib/notifications'
import Badges from './Badges'
import Library from './Library'
import Stats from './Stats'

interface Props {
  member: Member
  viewerId: string
  /** Conteúdo da aba Perfil. */
  children: ReactNode
}

type Sub = 'perfil' | 'leitura' | 'evolucao' | 'insignias'

/** Abas do perfil. No meu: Perfil, Leitura, Evolução e Insígnias. No dos amigos, sem a Evolução. */
export default function ProfileTabs({ member, viewerId, children }: Props) {
  const isMe = member.id === viewerId
  const [sub, setSub] = useState<Sub>('perfil')
  const target = useNavTarget()

  // Curtida ou "quero ler também" abre a minha Leitura.
  useEffect(() => {
    if (!isMe || target?.type !== 'library') return
    setSub('leitura')
    clearNavTarget()
  }, [isMe, target])

  const subs: [Sub, string][] = [
    ['perfil', 'Perfil'],
    ['leitura', 'Leitura'],
    ...(isMe ? ([['evolucao', 'Evolução']] as [Sub, string][]) : []),
    ['insignias', 'Insígnias'],
  ]

  return (
    <>
      <nav className={`subtabs ${subs.length === 4 ? 'four' : 'three'}`} aria-label="Seções do perfil">
        {subs.map(([id, label]) => (
          <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)} aria-current={sub === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>
      {sub === 'perfil' && children}
      {sub === 'leitura' && <Library ownerId={member.id} viewerId={viewerId} />}
      {sub === 'evolucao' && <Stats userId={viewerId} />}
      {sub === 'insignias' && <Badges member={member} isMe={isMe} />}
    </>
  )
}
