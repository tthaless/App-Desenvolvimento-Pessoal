import { lazy } from 'react'
import type { ComponentType } from 'react'

const KEY = 'streak:recarregou'

/**
 * Carrega uma tela só quando ela abre.
 * Se o app foi atualizado enquanto estava aberto, o pedaço antigo não existe mais no servidor:
 * nesse caso recarrega a página uma vez pra pegar a versão nova.
 */
export function lazyScreen<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load()
      try {
        sessionStorage.removeItem(KEY)
      } catch {
        /* sem armazenamento */
      }
      return mod
    } catch (e) {
      let again = false
      try {
        again = !!sessionStorage.getItem(KEY)
        if (!again) sessionStorage.setItem(KEY, '1')
      } catch {
        again = true
      }
      if (!again && navigator.onLine) {
        location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw e
    }
  })
}
