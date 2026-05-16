'use client'

import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookMarked, CheckCircle2, Circle, CircleDot, Filter, FolderOpen, SkipForward } from 'lucide-react'

type ProgressFilter = '' | 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'done'

interface ItemProgress {
  status: string
  lastOpenedAt: string | null
  completedAt: string | null
}

interface Item {
  id: string
  title: string
  type: string
  localPath: string
  folderPath: string
  topic: string | null
  skillType: string | null
  cefrLevel: { code: string } | null
  progress: ItemProgress | null
}

interface FolderRow {
  path: string
  count: number
}

/** Lê `?folder=` na primeira renderização para o fetch não correr antes do estado da URL existir. */
function parseFolderQuery(sp: ReadonlyURLSearchParams): { course: string; folderExact: string } {
  if (!sp.has('folder')) {
    return { course: '', folderExact: '' }
  }
  const raw = sp.get('folder') ?? ''
  if (raw === '') {
    return { course: '', folderExact: '__root__' }
  }
  const first = raw.split('/')[0] ?? ''
  return { course: first, folderExact: raw }
}

function LibraryPageInner() {
  const { status } = useSession()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [folders, setFolders] = useState<{ courses: string[]; paths: FolderRow[] }>({
    courses: [],
    paths: [],
  })
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('')
  const [course, setCourse] = useState(() => parseFolderQuery(searchParams).course)
  const [folderExact, setFolderExact] = useState(() => parseFolderQuery(searchParams).folderExact)
  const libraryFetchGen = useRef(0)

  const urlFolderSig = `${searchParams.has('folder') ? '1' : '0'}:${searchParams.get('folder') ?? ''}`

  useEffect(() => {
    const p = parseFolderQuery(searchParams)
    setCourse(p.course)
    setFolderExact(p.folderExact)
    // Só reagimos a `urlFolderSig`: incluir `searchParams` no array fazia o efeito correr a cada
    // render (ref instável) e repunha os selects a partir da URL, apagando o filtro manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFolderSig])

  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await fetch('/api/library/folders')
        if (res.ok) {
          const data = await res.json()
          setFolders({
            courses: data.courses || [],
            paths: data.paths || [],
          })
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (status === 'authenticated') loadFolders()
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return

    const gen = ++libraryFetchGen.current

    async function load() {
      setLoading(true)
      try {
        const q = new URLSearchParams()
        if (type) q.set('type', type)
        if (folderExact === '__root__') q.set('folder', '')
        else if (folderExact !== '') q.set('folder', folderExact)
        else if (course) q.set('course', course)
        const res = await fetch(`/api/library?${q}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = await res.json()
        if (gen !== libraryFetchGen.current) return
        const raw = (data.items || []) as Item[]
        setItems(
          raw.map((it) => ({
            ...it,
            progress: it.progress ?? null,
          }))
        )
      } catch (e) {
        if (gen !== libraryFetchGen.current) return
        console.error(e)
      } finally {
        if (gen === libraryFetchGen.current) setLoading(false)
      }
    }

    void load()
  }, [status, type, course, folderExact])

  const pathOptions = useMemo(() => {
    if (!course) return folders.paths
    return folders.paths.filter(
      ({ path: p }) => p === course || p.startsWith(`${course}/`) || p === ''
    )
  }, [folders.paths, course])

  function itemProgressStatus(it: Item): string {
    return it.progress?.status ?? 'not_started'
  }

  const visibleItems = useMemo(() => {
    if (!progressFilter) return items
    return items.filter((it) => {
      const s = itemProgressStatus(it)
      if (progressFilter === 'done') return s === 'completed' || s === 'skipped'
      return s === progressFilter
    })
  }, [items, progressFilter])

  const progressSummary = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let skipped = 0
    for (const it of items) {
      const s = itemProgressStatus(it)
      if (s === 'completed') completed += 1
      else if (s === 'in_progress') inProgress += 1
      else if (s === 'skipped') skipped += 1
    }
    const total = items.length
    const notStarted = total - completed - inProgress - skipped
    return { total, completed, inProgress, skipped, notStarted }
  }, [items])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <BookMarked className="w-7 h-7 text-primary" />
        Biblioteca
      </h1>
      <p className="text-muted-foreground mb-6">
        Conteúdos em <code className="text-sm bg-muted px-1 rounded">content/</code> (por curso/pasta).
        Depois de copiar ficheiros:{' '}
        <code className="text-sm bg-muted px-1 rounded">npm run content:sync</code>
      </p>

      {items.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Nesta lista:{' '}
          <span className="text-foreground font-medium">{progressSummary.completed}</span>{' '}
          concluído(s)
          {progressSummary.inProgress > 0 && (
            <>
              {' · '}
              <span className="text-foreground font-medium">{progressSummary.inProgress}</span> em
              progresso
            </>
          )}
          {progressSummary.skipped > 0 && (
            <>
              {' · '}
              <span className="text-foreground font-medium">{progressSummary.skipped}</span>{' '}
              ignorado(s)
            </>
          )}
          {progressSummary.notStarted > 0 && (
            <>
              {' · '}
              <span className="text-foreground font-medium">{progressSummary.notStarted}</span> por
              abrir
            </>
          )}
          <span className="text-muted-foreground"> ({progressSummary.total} ficheiros)</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <label className="text-sm text-muted-foreground whitespace-nowrap">Tipo</label>
          <select
            className="input max-w-[180px]"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="video">Vídeo</option>
            <option value="audio">Áudio</option>
            <option value="pdf">PDF</option>
            <option value="image">Imagem</option>
            <option value="text">Texto</option>
            <option value="html">HTML / questionário</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Estudo</label>
          <select
            className="input max-w-[220px]"
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value as ProgressFilter)}
          >
            <option value="">Todos os estados</option>
            <option value="not_started">Por abrir (não iniciado)</option>
            <option value="in_progress">Em progresso (já abri)</option>
            <option value="completed">Concluídos</option>
            <option value="skipped">Ignorados</option>
            <option value="done">Finalizados (concluído ou ignorado)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          <label className="text-sm text-muted-foreground whitespace-nowrap">Curso (pasta)</label>
          <select
            className="input min-w-[200px] max-w-[min(100%,280px)]"
            value={course}
            onChange={(e) => {
              setCourse(e.target.value)
              setFolderExact('')
            }}
          >
            <option value="">Todos os cursos</option>
            {folders.courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Pasta exacta</label>
          <select
            className="input flex-1 min-w-0"
            value={folderExact}
            onChange={(e) => setFolderExact(e.target.value)}
          >
            <option value="">(só curso / todos neste curso)</option>
            <option value="__root__">Raiz de content/ (sem subpasta)</option>
            {pathOptions
              .filter((row) => row.path !== '')
              .map((row) => (
                <option key={row.path} value={row.path}>
                  {row.path} — {row.count} ficheiro(s)
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {visibleItems.map((it, index) => {
          const st = itemProgressStatus(it)
          return (
            <Link
              key={it.id}
              href={`/library/${it.id}`}
              className={`card py-4 block hover:border-primary/40 transition-colors ${
                st === 'completed'
                  ? 'border-l-4 border-l-emerald-500/80'
                  : st === 'in_progress'
                    ? 'border-l-4 border-l-amber-500/70'
                    : st === 'skipped'
                      ? 'border-l-4 border-l-muted-foreground/50'
                      : ''
              }`}
            >
              <div className="flex justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground font-normal tabular-nums shrink-0">
                      {index + 1}.
                    </span>
                    <span className="min-w-0">{it.title}</span>
                    {st === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluído
                      </span>
                    )}
                    {st === 'in_progress' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
                        <CircleDot className="w-3.5 h-3.5" />
                        Em progresso
                      </span>
                    )}
                    {st === 'skipped' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        <SkipForward className="w-3.5 h-3.5" />
                        Ignorado
                      </span>
                    )}
                    {st === 'not_started' && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Circle className="w-3.5 h-3.5" />
                        Por abrir
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                    {it.localPath}
                  </p>
                  {it.folderPath && (
                    <p className="text-xs text-primary mt-1">Pasta: {it.folderPath}</p>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground shrink-0">
                  {it.cefrLevel && (
                    <span className="text-primary font-medium">{it.cefrLevel.code}</span>
                  )}{' '}
                  · <span className="capitalize">{it.type}</span>
                  {it.skillType && ` · ${it.skillType}`}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {items.length > 0 && visibleItems.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-12">
          Nenhum ficheiro com este filtro de estudo. Escolhe outro estado em &quot;Estudo&quot;.
        </p>
      )}

      {items.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-12">
          Nada encontrado. Sincroniza a pasta <code className="bg-muted px-1 rounded">content/</code> ou
          ajusta os filtros.
        </p>
      )}
    </main>
  )
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      }
    >
      <LibraryPageInner />
    </Suspense>
  )
}
