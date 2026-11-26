import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Versão menor, dentro de uma aba (a barra de baixo continua funcionando). */
  inline?: boolean
}

interface State {
  failed: boolean
}

/** Se uma parte do app quebrar, mostra um aviso com "Tentar de novo" em vez de tela em branco. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na tela:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={`crash ${this.props.inline ? 'inline' : ''}`} role="alert">
        <p className="crash-title">Algo deu errado</p>
        <p className="muted small">Essa parte do app não carregou. Seus dados estão salvos.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={() => this.setState({ failed: false })}>
            <RefreshCw size={17} aria-hidden /> Tentar de novo
          </button>
          <button className="btn ghost" onClick={() => location.reload()}>
            Recarregar o app
          </button>
        </div>
      </div>
    )
  }
}
