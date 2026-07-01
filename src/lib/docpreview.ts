/**
 * Resolve um link de documento (Google Drive, imagem, PDF ou outro) para as URLs
 * de prévia (thumbnail), embutir (iframe/img), baixar e abrir.
 * Para o Drive, o arquivo precisa estar compartilhado como "qualquer pessoa com o link".
 */
export type DocKind = 'drive' | 'image' | 'pdf' | 'other'

export type DocPreview = {
  kind: DocKind
  /** Miniatura para o card (ou null → ícone). */
  thumbnail: string | null
  /** URL para iframe no modal (null quando for imagem). */
  embed: string | null
  /** URL da imagem no modal (só para imagens). */
  image: string | null
  /** URL de download. */
  download: string
  /** Link original (abrir em nova aba). */
  open: string
}

function driveId(url: string): string | null {
  const m = url.match(/\/d\/([-\w]{10,})/) || url.match(/[?&]id=([-\w]{10,})/)
  return m ? m[1] : null
}

export function resolveDoc(link: string | null | undefined): DocPreview | null {
  const url = (link || '').trim()
  if (!/^https?:\/\//i.test(url)) return null

  const id = /drive\.google\.com/.test(url) ? driveId(url) : null
  if (id) {
    return {
      kind: 'drive',
      thumbnail: `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
      embed: `https://drive.google.com/file/d/${id}/preview`,
      image: null,
      download: `https://drive.google.com/uc?export=download&id=${id}`,
      open: url,
    }
  }

  const path = url.split(/[?#]/)[0].toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(path)) {
    return { kind: 'image', thumbnail: url, embed: null, image: url, download: url, open: url }
  }
  if (/\.pdf$/.test(path)) {
    return { kind: 'pdf', thumbnail: null, embed: url, image: null, download: url, open: url }
  }
  return { kind: 'other', thumbnail: null, embed: url, image: null, download: url, open: url }
}

/**
 * DocPreview a partir de um arquivo enviado (URLs assinadas do próprio servidor).
 * Como sabemos o MIME, classificamos com precisão: imagem → <img>; resto → iframe.
 */
export function previewFromArquivo(a: { mime: string; url: string; download: string }): DocPreview {
  const mime = (a.mime || '').toLowerCase()
  if (mime.startsWith('image/')) {
    return { kind: 'image', thumbnail: a.url, embed: null, image: a.url, download: a.download, open: a.url }
  }
  return {
    kind: mime.includes('pdf') ? 'pdf' : 'other',
    thumbnail: null,
    embed: a.url,
    image: null,
    download: a.download,
    open: a.url,
  }
}
