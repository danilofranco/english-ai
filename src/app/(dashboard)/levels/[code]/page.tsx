'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Route, BookOpen, Mic } from 'lucide-react'

interface ContentProgressEntry {
  status: string
  completedAt: string | null
  lastOpenedAt: string | null
}

interface LevelDetail {
  id: string
  code: string
  title: string
  description: string
  expectedCapabilities: string
  expectedSkills: string
  practiceTasks: { id: string; title: string; estimatedDurationSec: number }[]
  learningPaths: {
    id: string
    title: string
    description: string | null
    steps: { id: string; stepType: string; referenceId: string; order: number }[]
  }[]
  learningContents: {
    id: string
    title: string
    localPath: string
    folderPath: string
    type: string
  }[]
}

export default function LevelDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const { status } = useSession()
  const [level, setLevel] = useState<LevelDetail | null>(null)
  const [contentProgressById, setContentProgressById] = useState<
    Record<string, ContentProgressEntry>
  >({})
  const [nextContentId, setNextContentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLevel() {
      try {
        const res = await fetch(`/api/levels/${code}`)
        if (res.ok) {
          const data = await res.json()
          setLevel(data.level)
          setContentProgressById(data.contentProgressById ?? {})
          setNextContentId(data.nextContentId ?? null)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated' && code) fetchLevel()
    else if (status === 'unauthenticated') setLoading(false)
  }, [status, code])

  function progressLabel(
    contentId: string,
    st: string | undefined
  ): { text: string; className: string } {
    if (nextContentId === contentId && st !== 'completed' && st !== 'skipped') {
      return { text: 'Próximo', className: 'bg-primary/15 text-primary border-primary/30' }
    }
    if (st === 'completed') {
      return { text: 'Concluído', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' }
    }
    if (st === 'skipped') {
      return { text: 'Ignorado', className: 'bg-muted text-muted-foreground border-border' }
    }
    if (st === 'in_progress') {
      return { text: 'Em progresso', className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25' }
    }
    return { text: 'Pendente', className: 'bg-secondary text-secondary-foreground border-border' }
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!level) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-4">Level not found</h1>
        <Link href="/levels" className="btn btn-primary">
          All levels
        </Link>
      </div>
    )
  }

  const showMonth1Cta = ['B1', 'B2'].includes(level.code.toUpperCase())

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/levels" className="btn btn-ghost mb-6 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Levels
      </Link>

      <h1 className="text-3xl font-bold">
        {level.code} — {level.title}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-3xl">{level.description}</p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h2 className="font-semibold mb-2">Expected capabilities</h2>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
            {level.expectedCapabilities}
          </pre>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Skills focus</h2>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
            {level.expectedSkills}
          </pre>
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-4 flex items-center gap-2">
        <Route className="w-5 h-5" />
        Learning paths
      </h2>
      <div className="space-y-3">
        {level.learningPaths.map((p) => (
          <div key={p.id} className="card flex justify-between items-center gap-4 flex-wrap">
            <div>
              <p className="font-medium">{p.title}</p>
              {p.description && (
                <p className="text-sm text-muted-foreground">{p.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {p.steps.length} steps
              </p>
            </div>
            <Link href={`/paths/${p.id}`} className="btn btn-primary shrink-0">
              Open path
            </Link>
          </div>
        ))}
        {level.learningPaths.length === 0 && (
          <p className="text-muted-foreground text-sm">No paths seeded for this band yet.</p>
        )}
      </div>

      {showMonth1Cta && (
        <div className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium text-foreground">Month 1 speaking track</p>
          <p className="text-muted-foreground mt-1">
            Week-by-week missions live under Practice; they are hidden from this flat task list
            so the band page stays a roadmap (paths + library + ad-hoc tasks).
          </p>
          <Link href="/practice" className="btn btn-primary mt-3 inline-flex">
            Open Month 1 missions
          </Link>
        </div>
      )}

      <h2 className="text-xl font-semibold mt-10 mb-4 flex items-center gap-2">
        <Mic className="w-5 h-5" />
        Practice tasks
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {level.practiceTasks.map((t) => (
          <Link key={t.id} href={`/practice/${t.id}`} className="card hover:border-primary/40">
            <p className="font-medium">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.ceil(t.estimatedDurationSec / 60)} min
            </p>
          </Link>
        ))}
        {level.practiceTasks.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No standalone practice tasks in this band. Month 1 speaking missions live under{' '}
            <Link href="/practice" className="text-primary underline-offset-4 hover:underline">
              Practice
            </Link>
            .
          </p>
        )}
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        Library (this band)
      </h2>
      {nextContentId && (
        <p className="text-sm text-muted-foreground mb-3">
          Próximo sugerido:{' '}
          <Link
            href={`/library/${nextContentId}`}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {level.learningContents.find((x) => x.id === nextContentId)?.title ?? 'Abrir'}
          </Link>
        </p>
      )}
      <ul className="space-y-2 text-sm">
        {level.learningContents.map((c) => {
          const st = contentProgressById[c.id]?.status
          const badge = progressLabel(c.id, st)
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 justify-between gap-y-1 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/library/${c.id}`}
                  className="text-foreground font-medium hover:text-primary hover:underline"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-muted-foreground font-mono truncate" title={c.localPath}>
                  {c.folderPath ? `${c.folderPath}/` : ''}
                  {c.localPath.split('/').pop()}
                </p>
              </div>
              <span
                className={`text-xs shrink-0 rounded-full border px-2 py-0.5 ${badge.className}`}
              >
                {badge.text}
              </span>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
