import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes junto com o app (sem depender do Google na hora de abrir).
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import './index.css'
import './styles/app.css'
import './styles/features.css'
import './styles/system.css'
import './styles/theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Deixa o app instalável na tela inicial do celular.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
