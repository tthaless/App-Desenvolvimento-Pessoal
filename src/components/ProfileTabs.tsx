import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Member } from '../types'
import { clearNavTarget, useNavTarget } from '../lib/notifications'
import Badges from './Badges'
import { lazyScreen } from '../lib/lazy'
import { SkeletonRows } from './Skeleton'

const Library = lazyScreen(() => import('./Library'))
const Stats = lazyScreen(() => import('./Stats'))

interface Props {
  member: Member
  viewerId: string
  /** Conteúdo da aba Perfil. */
  children: ReactNode
  /** Avisa quando a pessoa troca de aba (o topo encolhe fora da aba Perfil). */
  onSub?: (sub: Sub) => void
}

export type Sub = 'perfil' | 'leitura' | 'evolucao' | 'insignias'

/** Abas do perfil. No meu: Perfil, Leitura, Evolução e Insígnias. No dos amigos, sem a Evolução. */
export default function ProfileTabs({ member, viewerId, children, onSub }: Props) {
  const isMe = member.id === viewerId
  const [sub, setSubState] = useState<Sub>('perfil')
  const setSub = (s: Sub) => {
    setSubState(s)
    onSub?.(s)
  }
  const target = useNavTarget()

  // Curtida ou "quero ler também" abre a minha Leitura.
  useEffect(() => {
    if (!isMe || target?.type !== 'library') return
    setSubState('leitura')
    onSub?.('leitura')
    clearNavTarget()
  }, [isMe, target, onSub])

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
      <Suspense fallback={<SkeletonRows count={4} />}>
        {sub === 'leitura' && <Library ownerId={member.id} viewerId={viewerId} />}
        {sub === 'evolucao' && <Stats userId={viewerId} />}
        {sub === 'insignias' && <Badges member={member} isMe={isMe} />}
      </Suspense>
    </>
  )
}
