/** Aviso de que algo não carregou, com botão pra tentar de novo (no lugar de uma tela vazia). */
export default function LoadError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <p className="msg error">{text}</p>
      <button type="button" className="btn ghost" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  )
}
