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

/**
 * Reconhece um arquivo do Google — Drive (arquivo), Docs, Planilhas ou Slides —
 * e devolve as URLs de embutir e baixar. O endpoint de thumbnail do Drive
 * (`drive.google.com/thumbnail?id=…`) funciona para todos eles, desde que o
 * arquivo esteja compartilhado como "qualquer pessoa com o link".
 */
function googleFile(url: string): { id: string; embed: string; download: string } | null {
  // Google Docs / Planilhas / Apresentações
  const docs = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([-\w]{10,})/)
  if (docs) {
    const kind = docs[1]
    const id = docs[2]
    return {
      id,
      embed: `https://docs.google.com/${kind}/d/${id}/preview`,
      download: `https://docs.google.com/${kind}/d/${id}/export?format=pdf`,
    }
  }
  // Google Drive (arquivo): /file/d/ID, /d/ID, open?id=ID, uc?id=ID
  if (/drive\.google\.com/.test(url) && !/\/drive\/folders\//.test(url)) {
    const m = url.match(/\/d\/([-\w]{10,})/) || url.match(/[?&]id=([-\w]{10,})/)
    if (m) {
      const id = m[1]
      return {
        id,
        embed: `https://drive.google.com/file/d/${id}/preview`,
        download: `https://drive.google.com/uc?export=download&id=${id}`,
      }
    }
  }
  return null
}

export function resolveDoc(link: string | null | undefined): DocPreview | null {
  const url = (link || '').trim()
  if (!/^https?:\/\//i.test(url)) return null

  const g = googleFile(url)
  if (g) {
    return {
      kind: 'drive',
      thumbnail: `https://drive.google.com/thumbnail?id=${g.id}&sz=w1000`,
      embed: g.embed,
      image: null,
      download: g.download,
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
