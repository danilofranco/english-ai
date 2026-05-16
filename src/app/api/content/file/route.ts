import { NextResponse } from 'next/server'
import { createReadStream, statSync, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'

const CONTENT_ROOT = path.join(process.cwd(), 'content')

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

function safeResolveUnderContent(rel: string): string | null {
  if (!rel || rel.includes('..')) return null
  const normalized = path.normalize(rel).replace(/^(\.\/)+/, '')
  if (normalized.startsWith('..')) return null
  const abs = path.join(CONTENT_ROOT, normalized)
  const rootResolved = path.resolve(CONTENT_ROOT)
  const fileResolved = path.resolve(abs)
  if (!fileResolved.startsWith(rootResolved + path.sep) && fileResolved !== rootResolved) {
    return null
  }
  return fileResolved
}

/**
 * Um intervalo `bytes=` (vídeo/áudio precisam disto para seek na barra).
 * Ignora ranges adicionais após vírgula; devolve null para servir o ficheiro completo (200).
 */
function parseSingleByteRange(
  rangeHeader: string | null,
  fileSize: number
): { start: number; end: number } | 'unsatisfiable' | null {
  if (!rangeHeader || !rangeHeader.toLowerCase().startsWith('bytes=')) return null
  if (fileSize === 0) {
    return /^bytes=/i.test(rangeHeader.trim()) ? 'unsatisfiable' : null
  }
  const first = rangeHeader.split(',')[0]?.trim() ?? ''
  const m = /^bytes=(\d*)-(\d*)$/i.exec(first)
  if (!m) return null
  const startStr = m[1]
  const endStr = m[2]
  if (startStr === '' && endStr === '') return null

  if (startStr === '' && endStr !== '') {
    const suffixLen = Number(endStr)
    if (!Number.isFinite(suffixLen) || suffixLen <= 0) return null
    const start = Math.max(0, fileSize - suffixLen)
    return { start, end: fileSize - 1 }
  }

  const start = Number(startStr)
  let end = endStr === '' ? fileSize - 1 : Number(endStr)
  if (!Number.isFinite(start) || start < 0) return null
  if (start >= fileSize) return 'unsatisfiable'
  if (!Number.isFinite(end)) return null
  if (end < start) return null
  end = Math.min(end, fileSize - 1)
  return { start, end }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rel = searchParams.get('path')
    if (!rel) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    const abs = safeResolveUnderContent(rel)
    if (!abs || !existsSync(abs)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const st = statSync(abs)
    if (!st.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const size = st.size
    const ext = path.extname(abs).toLowerCase()
    const contentType = MIME[ext] ?? 'application/octet-stream'

    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }

    const parsed = parseSingleByteRange(request.headers.get('range'), size)

    if (parsed === 'unsatisfiable') {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
        },
      })
    }

    if (parsed === null) {
      const stream = createReadStream(abs)
      const webStream = Readable.toWeb(stream) as ReadableStream
      return new NextResponse(webStream, {
        headers: {
          ...baseHeaders,
          'Content-Length': String(size),
        },
      })
    }

    const { start, end } = parsed
    const chunkLength = end - start + 1
    const stream = createReadStream(abs, { start, end })
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Length': String(chunkLength),
        'Content-Range': `bytes ${start}-${end}/${size}`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
