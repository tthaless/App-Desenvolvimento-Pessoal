/** Blocos cinzas pulsando enquanto o conteúdo carrega. */
export function SkeletonBlock({ height = 16, width = '100%', radius = 8, className = '' }: { height?: number | string; width?: number | string; radius?: number; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ height, width, borderRadius: radius }} aria-hidden />
}

/** Linhas de lista: foto redonda, nome e algo à direita. */
export function SkeletonRows({ count = 4, cover = false }: { count?: number; cover?: boolean }) {
  return (
    <div className="skeleton-rows" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row">
          {cover ? <SkeletonBlock width={40} height={60} radius={6} /> : <SkeletonBlock width={34} height={34} radius={17} />}
          <span className="skeleton-lines">
            <SkeletonBlock height={13} width={`${55 + ((i * 17) % 30)}%`} />
            {cover && <SkeletonBlock height={11} width="35%" />}
          </span>
          <SkeletonBlock width={42} height={22} radius={11} />
        </div>
      ))}
    </div>
  )
}

/** Card inteiro em carregamento. */
export function SkeletonCard({ height = 180 }: { height?: number }) {
  return (
    <div className="card skeleton-card" aria-busy="true" aria-label="Carregando">
      <SkeletonBlock height={14} width="40%" />
      <SkeletonBlock height={height - 90} width="60%" radius={12} />
      <SkeletonBlock height={44} radius={14} />
    </div>
  )
}

/** Bolinhas dos stories. */
export function SkeletonStories() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="skeleton-story" aria-hidden>
          <SkeletonBlock width={62} height={62} radius={31} />
          <SkeletonBlock width={40} height={10} />
        </span>
      ))}
    </>
  )
}
