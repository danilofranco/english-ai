'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Layers, ChevronRight, Target } from 'lucide-react'

interface LevelRow {
  id: string
  code: string
  title: string
  description: string
  order: number
  _count: {
    practiceTasks: number
    learningPaths: number
    learningContents: number
  }
}

export default function LevelsIndexPage() {
  const { status } = useSession()
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/levels')
        const data = await res.json()
        setLevels(data.levels || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') load()
    else if (status === 'unauthenticated') setLoading(false)
  }, [status])

  if (loading || status === 'loading') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Layers className="w-7 h-7 text-primary" />
        CEFR levels
      </h1>
      <p className="text-muted-foreground mb-8">
        Structure is CEFR-first: open a band to see tasks, paths, and your library slice.
      </p>

      <Link
        href="/practice"
        className="card mb-8 border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <Target className="w-4 h-4" />
            Month 1 — Professional Foundation
          </p>
          <h2 className="text-lg font-semibold mt-1">Speaking missions (4 weeks)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Structured track with evaluation and drills; not duplicated under each CEFR card.
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary shrink-0" />
      </Link>

      <div className="grid gap-4 md:grid-cols-2">
        {levels.map((l) => (
          <Link
            key={l.id}
            href={`/levels/${l.code}`}
            className="card hover:border-primary/40 transition-colors flex items-start justify-between gap-4"
          >
            <div>
              <p className="text-sm text-muted-foreground">{l.code}</p>
              <h2 className="text-lg font-semibold">{l.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {l.description}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {l._count.practiceTasks} tasks · {l._count.learningPaths} paths ·{' '}
                {l._count.learningContents} content items
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </main>
  )
}
