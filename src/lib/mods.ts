/** Quem modera o grupo (nomes sem diferenciar maiúsculas). Aparece um selo pequeno ao lado do nome, no perfil. */
const MODS = ['taleco', 'dezin']

export function isMod(username: string | undefined | null) {
  return !!username && MODS.includes(username.trim().toLowerCase())
}
