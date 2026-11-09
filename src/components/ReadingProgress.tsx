/** Barra de quanto do livro já foi lido. Só aparece se a pessoa informou o total de páginas. */
export function ReadingProgress({ page, total }: { page?: number | null; total?: number | null }) {
  if (!total || !page) return null
  const pct = Math.min(100, Math.round((page / total) * 100))
  return (
    <div className="reading-progress">
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso do livro">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="reading-progress-text">
        <strong>{pct}%</strong> · pág. {page} de {total}
      </span>
    </div>
  )
}
