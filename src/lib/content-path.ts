import path from 'path'

const CONTENT_PREFIX = /^content\/?/i

/**
 * `localPath` como gravado na BD: `content/curso/modulo/file.mp4`
 * → pasta sob content: `curso/modulo`
 */
export function folderPathFromLocalPath(localPath: string): string {
  const norm = localPath.replace(/\\/g, '/').replace(CONTENT_PREFIX, '')
  const dir = path.posix.dirname(norm)
  return dir === '.' ? '' : dir
}

/** Caminho relativo à raiz `content/` (para servir ficheiro) */
export function relativeFileInsideContent(localPath: string): string {
  return localPath.replace(/\\/g, '/').replace(CONTENT_PREFIX, '')
}

/** URL da API que faz stream do ficheiro (path relativo a content/) */
export function contentFileApiUrl(localPath: string): string {
  const rel = relativeFileInsideContent(localPath)
  return `/api/content/file?path=${encodeURIComponent(rel)}`
}
