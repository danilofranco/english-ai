'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { contentFileApiUrl } from '@/lib/content-path'

interface Item {
  id: string
  title: string
  type: string
  localPath: string
  folderPath: string
  description: string | null
  cefrLevel: { code: string; title: string } | null
}

interface ProgressRow {
  status: string
  lastOpenedAt: string | null
  completedAt: string | null
}

interface FolderNav {
  position: number
  total: number
  prevId: string | null
  nextId: string | null
  folderPath: string
}

export default function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { status: authStatus } = useSession()
  const [item, setItem] = useState<Item | null | undefined>(undefined)
  const [progress, setProgress] = useState<ProgressRow | null>(null)
  const [progressBusy, setProgressBusy] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [folderNav, setFolderNav] = useState<FolderNav | null>(null)
  const [textBody, setTextBody] = useState<string | null>(null)
  const openSentForId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/library/${id}`)
        if (!res.ok) {
          setItem(null)
          setProgress(null)
          setFolderNav(null)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setItem(data.item)
        setProgress(data.progress ?? null)
        setFolderNav(data.folderNav ?? null)
        const t = data.item?.type
        if (t === 'text' || t === 'grammar' || t === 'vocabulary') {
          const u = contentFileApiUrl(data.item.localPath)
          const tr = await fetch(u)
          if (tr.ok && tr.headers.get('content-type')?.includes('text')) {
            setTextBody(await tr.text())
          }
        }
      } catch {
        setItem(null)
        setProgress(null)
        setFolderNav(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !item) return
    if (openSentForId.current === id) return
    openSentForId.current = id
    void fetch(`/api/library/${id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.progress) {
          setProgress({
            status: data.progress.status,
            lastOpenedAt: data.progress.lastOpenedAt,
            completedAt: data.progress.completedAt,
          })
        }
      })
      .catch(() => {})
  }, [authStatus, id, item])

  if (item === undefined) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  if (!item) {
    return (
      <main className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Conteúdo não encontrado.</p>
        <Link href="/library" className="btn btn-primary">
          Voltar à biblioteca
        </Link>
      </main>
    )
  }

  const mediaUrl = contentFileApiUrl(item.localPath)
  const isVideo = item.type === 'video'
  const isAudio = item.type === 'audio'
  const isPdf = item.type === 'pdf'
  const isImage = item.type === 'image'
  const isHtml = item.type === 'html'

  async function postProgressAction(action: 'complete' | 'skip' | 'reset') {
    setProgressBusy(true)
    setProgressError(null)
    try {
      const res = await fetch(`/api/library/${id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProgressError(
          typeof data.error === 'string'
            ? data.error
            : `Erro ao guardar (${res.status})`
        )
        return
      }
      if (data.progress) {
        setProgress({
          status: data.progress.status,
          lastOpenedAt: data.progress.lastOpenedAt ?? null,
          completedAt: data.progress.completedAt ?? null,
        })
      }
    } finally {
      setProgressBusy(false)
    }
  }

  const levelHref = item.cefrLevel ? `/levels/${item.cefrLevel.code}` : null
  const listFolderHref = item.folderPath
    ? `/library?folder=${encodeURIComponent(item.folderPath)}`
    : '/library'

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href={listFolderHref} className="btn btn-ghost inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Biblioteca
        </Link>
      </div>

      {folderNav && folderNav.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-xl border border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Nesta pasta:{' '}
            <span className="font-medium text-foreground">
              {folderNav.position} / {folderNav.total}
            </span>
            <span className="hidden sm:inline"> · ordem por caminho (numérica)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {folderNav.prevId ? (
              <Link
                href={`/library/${folderNav.prevId}`}
                className="btn btn-outline inline-flex items-center gap-1 text-sm py-1.5 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Link>
            ) : (
              <span className="btn btn-outline opacity-40 pointer-events-none text-sm py-1.5 px-3 inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </span>
            )}
            {folderNav.nextId ? (
              <Link
                href={`/library/${folderNav.nextId}`}
                className="btn btn-primary inline-flex items-center gap-1 text-sm py-1.5 px-3"
              >
                Seguinte
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="btn btn-primary opacity-40 pointer-events-none text-sm py-1.5 px-3 inline-flex items-center gap-1">
                Seguinte
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
      <p className="text-sm text-muted-foreground font-mono break-all mb-2">{item.localPath}</p>
      {item.folderPath && (
        <p className="text-sm text-primary mb-4">Pasta: {item.folderPath}</p>
      )}
      {item.description && <p className="text-muted-foreground mb-6">{item.description}</p>}
      {item.cefrLevel && (
        <p className="text-sm text-muted-foreground mb-2">
          CEFR: {item.cefrLevel.code}
          {levelHref && (
            <>
              {' · '}
              <Link href={levelHref} className="text-primary hover:underline">
                Ver nível e lista
              </Link>
            </>
          )}
        </p>
      )}

      {authStatus === 'authenticated' && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">
            Estado:{' '}
            <strong className="text-foreground">
              {progress?.status === 'completed' && 'Concluído'}
              {progress?.status === 'skipped' && 'Ignorado'}
              {progress?.status === 'in_progress' && 'Em progresso'}
              {(!progress || progress.status === 'not_started') && 'Não iniciado'}
            </strong>
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary text-xs py-1.5 px-3"
              disabled={progressBusy || progress?.status === 'completed'}
              onClick={() => postProgressAction('complete')}
            >
              Marcar concluído
            </button>
            <button
              type="button"
              className="btn btn-outline text-xs py-1.5 px-3"
              disabled={progressBusy || progress?.status === 'skipped'}
              onClick={() => postProgressAction('skip')}
            >
              Ignorar
            </button>
            {(progress?.status === 'completed' ||
              progress?.status === 'skipped' ||
              progress?.status === 'in_progress') && (
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 px-3"
                disabled={progressBusy}
                onClick={() => postProgressAction('reset')}
              >
                Desfazer estado
              </button>
            )}
          </div>
          {progressError && (
            <p className="text-sm text-destructive w-full basis-full mt-1">{progressError}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {isVideo && (
          <video
            src={mediaUrl}
            controls
            className="w-full max-h-[80vh] bg-black"
            preload="metadata"
          />
        )}
        {isAudio && (
          <div className="p-8 flex justify-center">
            <audio src={mediaUrl} controls className="w-full max-w-xl" preload="metadata" />
          </div>
        )}
        {isPdf && (
          <iframe
            title={item.title}
            src={mediaUrl}
            className="w-full min-h-[85vh] border-0"
          />
        )}
        {isHtml && (
          <>
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-0">
              Questionário HTML (conteúdo local). Páginas só com JS/CSS inline costumam funcionar
              bem; se faltarem estilos ou imagens, o .html provavelmente aponta para ficheiros na
              mesma pasta — avisa se quiseres suporte automático (ex. injetar base URL).
            </p>
            <iframe
              title={item.title}
              src={mediaUrl}
              className="w-full min-h-[85vh] border-0"
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-same-origin"
              referrerPolicy="no-referrer"
            />
          </>
        )}
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt={item.title} className="w-full max-h-[85vh] object-contain bg-muted" />
        )}
        {(item.type === 'text' || textBody !== null) && textBody !== null && (
          <pre className="p-6 text-sm whitespace-pre-wrap overflow-auto max-h-[85vh] font-sans">
            {textBody}
          </pre>
        )}
        {item.type === 'text' && textBody === null && (
          <div className="p-6 text-muted-foreground text-sm">
            Pré-visualização de texto não disponível para este ficheiro.{' '}
            <a href={mediaUrl} className="text-primary underline" target="_blank" rel="noreferrer">
              Abrir ficheiro
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
