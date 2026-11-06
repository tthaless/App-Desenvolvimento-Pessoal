import { supabase } from './supabase'

export const MAX_PDF_MB = 5
export const MAX_PDF_PAGES = 30

// O leitor de PDF só é baixado quando alguém anexa ou abre um PDF.
export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

/** Confere tamanho, formato e número de páginas antes de enviar. */
export async function validatePdf(file: File) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Só dá pra anexar arquivo PDF.')
  }
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    throw new Error(`O PDF pode ter no máximo ${MAX_PDF_MB} MB.`)
  }
  const pdfjs = await loadPdfjs()
  let pages: number
  try {
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    pages = doc.numPages
    await doc.destroy()
  } catch {
    throw new Error('Não foi possível ler esse PDF.')
  }
  if (pages > MAX_PDF_PAGES) {
    throw new Error(`O PDF pode ter no máximo ${MAX_PDF_PAGES} páginas. Anexe só suas anotações, não o livro.`)
  }
}

export async function uploadAttachment(userId: string, bookId: string, file: File, isPublic: boolean, oldPath: string | null) {
  await validatePdf(file)
  const path = `${userId}/${bookId}/${Date.now()}.pdf`
  const up = await supabase.storage.from('anexos').upload(path, file, { contentType: 'application/pdf' })
  if (up.error) throw up.error
  const { error } = await supabase.from('books').update({ attachment_path: path, attachment_public: isPublic }).eq('id', bookId)
  if (error) {
    await supabase.storage.from('anexos').remove([path])
    throw error
  }
  if (oldPath) await supabase.storage.from('anexos').remove([oldPath])
}

export async function setAttachmentPublic(bookId: string, isPublic: boolean) {
  const { error } = await supabase.from('books').update({ attachment_public: isPublic }).eq('id', bookId)
  if (error) throw error
}

export async function removeAttachment(bookId: string, path: string) {
  const { error } = await supabase.from('books').update({ attachment_path: null }).eq('id', bookId)
  if (error) throw error
  await supabase.storage.from('anexos').remove([path])
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('anexos').createSignedUrl(path, 3600)
  if (error || !data) throw error ?? new Error('Não foi possível abrir o PDF.')
  return data.signedUrl
}
