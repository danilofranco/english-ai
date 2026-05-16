'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BarChart3, Target } from 'lucide-react'

interface Snap {
  estimatedOverallLevel: string | null
  totalPracticeMinutes: number
  totalAttempts: number
}

interface ReadinessRow {
  key: string
  week: number
  label: string
  status: 'ready' | 'in_progress' | 'baseline' | 'not_imported'
}

interface Month01Payload {
  message?: string
  baseline: boolean
  missions: {
    missionKey: string
    weekNumber: number
    weekTitle: string
    practiceTaskId: string
    complete: boolean
    attempted: boolean
    bestScore: number | null
    passThreshold: number
  }[]
  readiness: ReadinessRow[]
  bottleneckMissionKey: string | null
}

export default function ProgressPage() {
  const { status } = useSession()
  const [snapshot, setSnapshot] = useState<Snap | null>(null)
  const [trend, setTrend] = useState<
    { taskId: string; title: string; level: string; attempts: number; avgScore: number; lastScore: number }[]
  >([])
  const [month01, setMonth01] = useState<Month01Payload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [res, mres] = await Promise.all([
          fetch('/api/progress', { credentials: 'include' }),
          fetch('/api/progress/month01', { credentials: 'include' }),
        ])
        if (res.ok) {
          const data = await res.json()
          setSnapshot(data.snapshot)
          setTrend(data.taskTrend || [])
        }
        if (mres.ok) {
          setMonth01(await mres.json())
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') load()
    else if (status === 'unauthenticated') setLoading(false)
  }, [status])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-7 h-7 text-primary" />
        Progress
      </h1>

      {snapshot && (
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="card">
            <p className="text-sm text-muted-foreground">Estimated level</p>
            <p className="text-2xl font-bold text-primary">
              {snapshot.estimatedOverallLevel ?? '—'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-muted-foreground">Practice minutes</p>
            <p className="text-2xl font-bold">{snapshot.totalPracticeMinutes}</p>
          </div>
          <div className="card">
            <p className="text-sm text-muted-foreground">Evaluated attempts</p>
            <p className="text-2xl font-bold">{snapshot.totalAttempts}</p>
          </div>
        </div>
      )}

      {month01 && (
        <section className="mb-10 rounded-xl border border-primary/25 bg-primary/5 p-6">
          <div className="flex flex-wrap justify-between gap-4 items-start">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Month 1 — readiness map
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Professional speaking track; completion = best overall score ≥ mission
                threshold.
              </p>
            </div>
            <Link href="/practice" className="btn btn-primary">
              Open missions
            </Link>
          </div>

          {month01.readiness.some((r) => r.status === 'not_imported') ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
              {month01.message ??
                'Run npm run db:seed:month01 to import missions.'}
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {month01.readiness.map((r) => (
                  <div key={r.key} className="card py-4">
                    <p className="text-xs uppercase text-muted-foreground">Week {r.week}</p>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs mt-2 capitalize text-primary">{r.status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium">Missions</h3>
                {month01.missions.map((m) => (
                  <div
                    key={m.missionKey}
                    className="flex flex-wrap justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <span>
                      W{m.weekNumber} · {m.missionKey}
                      {m.weekTitle ? ` · ${m.weekTitle}` : ''}
                    </span>
                    <span className="font-mono text-xs">
                      {m.complete ? (
                        <span className="text-emerald-600 dark:text-emerald-400">pass</span>
                      ) : m.attempted ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          best {m.bestScore ?? '—'} / {m.passThreshold}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">not tried</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {month01.baseline && (
                <p className="text-sm text-muted-foreground mt-4">
                  Start your{' '}
                  <Link href="/practice" className="text-primary underline-offset-4 hover:underline">
                    first mission
                  </Link>{' '}
                  so we can build your baseline.
                </p>
              )}
              {month01.bottleneckMissionKey && (
                <p className="text-xs text-muted-foreground mt-3">
                  Bottleneck signal: {month01.bottleneckMissionKey} — retry after drills.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <h2 className="text-lg font-semibold mb-4">By task</h2>
      <div className="space-y-2">
        {trend.map((row) => (
          <div
            key={row.taskId}
            className="card flex flex-wrap justify-between gap-2 py-4"
          >
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.level}</p>
            </div>
            <div className="text-sm text-right">
              <span className="font-mono">{row.lastScore}</span> last ·{' '}
              <span className="font-mono">{row.avgScore}</span> avg · {row.attempts}{' '}
              tries
            </div>
          </div>
        ))}
        {trend.length === 0 && (
          <p className="text-muted-foreground">No evaluated attempts yet.</p>
        )}
      </div>
    </main>
  )
}
