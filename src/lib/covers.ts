import { supabase } from './supabase'
import { LONG_CACHE } from './signed'
import { portraitCover } from './utils'

// Capa enviada pela própria pessoa: fica na pasta pública "capas/<id da pessoa>/".

const BUCKET = 'capas'

/** Envia a foto como capa e devolve o endereço dela. */
export async function uploadOwnCover(userId: string, file: File): Promise<string> {
  const blob = await portraitCover(file)
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', ...LONG_CACHE })
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error('Falta rodar o SQL da capa própria no Supabase.')
    throw error
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Apaga uma capa enviada antes (se for uma das nossas). */
export async function removeOwnCover(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  if (!url || !url.includes(marker)) return
  await supabase.storage.from(BUCKET).remove([url.split(marker)[1]])
}

/** Troca a capa e já apaga a anterior, se ela tiver sido enviada pela pessoa. */
export async function replaceCover(
  table: 'books' | 'want_to_read',
  id: string,
  userId: string,
  file: File,
  previous: string | null,
): Promise<string> {
  const url = await uploadOwnCover(userId, file)
  const { error } = await supabase.from(table).update({ cover_url: url }).eq('id', id)
  if (error) {
    await removeOwnCover(url)
    if (error.code === '23514') throw new Error('Falta rodar o SQL da capa própria no Supabase.')
    throw error
  }
  await removeOwnCover(previous)
  return url
}
