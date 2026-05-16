'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PathDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [data, setData] = useState<{
    path: {
      title: string
      description: string | null
      level: { code: string }
      steps: { stepType: string; referenceId: string; order: number }[]
    }
  } | null>(null)

  useEffect(() => {
    fetch(`/api/paths/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [id])

  if (!data?.path) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const p = data.path

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/levels/${p.level.code}`} className="btn btn-ghost mb-6 inline-flex gap-2">
        <ArrowLeft className="w-4 h-4" />
        Level {p.level.code}
      </Link>
      <h1 className="text-2xl font-bold">{p.title}</h1>
      {p.description && (
        <p className="text-muted-foreground mt-2">{p.description}</p>
      )}

      <ol className="mt-8 space-y-4">
        {p.steps.map((s, i) => (
          <li key={i} className="card flex items-start gap-4">
            <span className="font-mono text-muted-foreground w-6">{s.order + 1}</span>
            <div>
              <p className="font-medium capitalize">{s.stepType}</p>
              <p className="text-xs text-muted-foreground break-all">{s.referenceId}</p>
              {s.stepType === 'practice' && (
                <Link href={`/practice/${s.referenceId}`} className="text-primary text-sm mt-2 inline-block">
                  Open practice
                </Link>
              )}
              {s.stepType === 'content' && (
                <Link href="/library" className="text-primary text-sm mt-2 inline-block">
                  Open library
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
