/**
 * Modo manutenção: só as contas abaixo entram no app; as outras veem o aviso.
 * Pra liberar pra todo mundo, mude ATIVO pra false.
 */
export const MANUTENCAO_ATIVA = true

/** Nomes no grupo que continuam usando o app durante a manutenção (sem diferenciar maiúsculas). */
const LIBERADOS = ['taleco', 'dezin', 'arienne']

export function liberadoNaManutencao(username: string | undefined | null) {
  return !!username && LIBERADOS.includes(username.trim().toLowerCase())
}
