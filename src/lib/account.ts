import { supabase } from './supabase'
import { clearMembers } from './members'
import { disablePush } from './push'

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  // Este aparelho para de receber os avisos dessa conta.
  await disablePush().catch(() => {})
  clearMembers()
  await supabase.auth.signOut()
}

/** Lista todos os arquivos dentro de uma pasta do armazenamento (inclui subpastas). */
async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return []
  const out: string[] = []
  for (const item of data) {
    const path = `${prefix}/${item.name}`
    // Pasta não tem id; arquivo tem.
    if (item.id) out.push(path)
    else out.push(...(await listAll(bucket, path)))
  }
  return out
}

/** Apaga as fotos e anexos da pessoa e depois a conta inteira. */
export async function deleteAccount(userId: string) {
  for (const bucket of ['provas', 'anexos', 'capas']) {
    const paths = await listAll(bucket, userId).catch(() => [])
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
    }
  }
  await disablePush().catch(() => {})
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  clearMembers()
  await supabase.auth.signOut({ scope: 'local' })
}
