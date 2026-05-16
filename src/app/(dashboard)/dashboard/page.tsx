'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Flame, Trophy, Target, Play, ArrowRight, BookOpen } from 'lucide-react'

interface Stats {
  totalPractices: number
  thisWeekPractices: number
  averageScore: number
  currentStreak: number
  totalTasksCompleted: number
  estimatedOverallLevel: string | null
  pendingReviews: number
  apaRecommendation: {
    phase: string
    reason: string
    microGoal: string
  } | null
  weakHints: { id: string; title: string; reason: string }[]
  recentEvaluations: {
    id: string
    taskTitle: string
    score: number | null
    createdAt: string
  }[]
}

interface TodayContext {
  mission: {
    missionKey: string
    weekNumber: number
    weekTitle: string
    learningObjective: string
    targetCEFR: string
    scenario: string
    prompt: string
    timeTargetSec: number
    practiceTaskId: string
    requiredElements: string[]
    successCriteria: string[]
    passOverallThreshold: number
  } | null
  completedCount: number
  total: number
  monthComplete: boolean
  currentWeek: number | null
  showModelAnswerForRecommended?: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [today, setToday] = useState<TodayContext | null>(null)
  const [loading, setLoading] = useState(true)
  const apaLabels: Record<string, string> = {
    acquire: 'Adquirir',
    practice: 'Praticar',
    adjust: 'Ajustar',
  }

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
        const tRes = await fetch('/api/curriculum/today', { credentials: 'include' })
        if (tRes.ok) {
          const t = await tRes.json()
          setToday(t)
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    if (session) {
      fetchDashboard()
    }
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to continue your English journey?
          </p>
        </div>

        {/* Today — Month 1 curriculum */}
        <div className="card border-primary/30 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">Today — Month 1</p>
              {today?.monthComplete ? (
                <>
                  <h2 className="text-xl font-bold mt-1">Month 1 completed</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    All speaking missions passed threshold. Replay any week from Practice.
                  </p>
                </>
              ) : today?.mission ? (
                <>
                  <h2 className="text-xl font-bold mt-1">{today.mission.weekTitle}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Target {today.mission.targetCEFR} · Week {today.mission.weekNumber}
                  </p>
                  <p className="text-sm mt-3">{today.mission.learningObjective}</p>
                  <p className="text-sm mt-2 font-medium">{today.mission.scenario}</p>
                  <p className="text-sm italic text-muted-foreground mt-1">
                    &quot;{today.mission.prompt}&quot;
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 list-disc ml-5 space-y-1">
                    {today.mission.requiredElements.slice(0, 5).map((el) => (
                      <li key={el}>{el}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mt-1">Start your first mission</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Run curriculum seed (<code className="text-xs bg-muted px-1 rounded">npm run db:seed:month01</code>) then open Practice — or no Month 1 data is imported yet.
                  </p>
                </>
              )}
            </div>
            <div className="text-right shrink-0">
              {today?.mission ? (
                <Link
                  href={`/practice/${today.mission.practiceTaskId}`}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start mission
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href="/practice" className="btn btn-outline">
                  Practice
                </Link>
              )}
              {today?.total !== undefined ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Progress {today.completedCount}/{today.total} missions (pass threshold)
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.thisWeekPractices || 0}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.averageScore || 0}</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPractices || 0}</p>
                <p className="text-sm text-muted-foreground">Total Practices</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalTasksCompleted || 0}</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="card border-primary/20">
            <p className="text-sm text-muted-foreground">Estimated level (from practice)</p>
            <p className="text-3xl font-bold text-primary">
              {stats?.estimatedOverallLevel ?? '—'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats?.pendingReviews ? `${stats.pendingReviews} review(s) queued` : 'No pending reviews'}
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Review today</h3>
            <Link href="/reviews" className="btn btn-outline w-full">
              Open queue
            </Link>
          </div>
        </div>

        {stats?.apaRecommendation && (
          <div className="card border-blue-500/20 mb-8">
            <p className="text-sm text-muted-foreground">APA next step</p>
            <h2 className="text-2xl font-bold text-blue-400">
              {apaLabels[stats.apaRecommendation.phase] ?? stats.apaRecommendation.phase}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.apaRecommendation.reason}
            </p>
            <p className="mt-3 font-medium">{stats.apaRecommendation.microGoal}</p>
          </div>
        )}

        {stats?.weakHints && stats.weakHints.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Suggested content (from last run)</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {stats.weakHints.map((h) => (
                <Link key={h.id} href="/library" className="card hover:border-primary/40">
                  <p className="font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Current Level */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Practice now</h2>
                  <p className="text-primary font-medium">Real tasks, real feedback</p>
                </div>
                <Link href="/practice" className="btn btn-primary">
                  Practice Now
                </Link>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Weekly Goal</span>
                  <span className="font-medium">
                    {Math.min(stats?.thisWeekPractices || 0, 5)}/5 practices
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(((stats?.thisWeekPractices || 0) / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {['Career', 'Product/Tech', 'General', 'Content'].map((cat) => (
                  <Link 
                    key={cat}
                    href={`/practice?category=${cat.toLowerCase().replace('/', '-')}`}
                    className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <p className="font-medium text-sm">{cat}</p>
                    <p className="text-xs text-muted-foreground">Category</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Link href="/practice" className="card flex items-center gap-3 hover:border-primary/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Practice</p>
                <p className="text-sm text-muted-foreground">
                  Start a practice task
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link href="/history" className="card flex items-center gap-3 hover:border-primary/50">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">History</p>
                <p className="text-sm text-muted-foreground">
                  View past attempts
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link href="/reviews" className="card flex items-center gap-3 hover:border-primary/50">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Reviews</p>
                <p className="text-sm text-muted-foreground">
                  View AI feedback
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Recent Evaluations */}
        {stats?.recentEvaluations && stats.recentEvaluations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Practice</h2>
              <Link href="/history" className="text-primary text-sm hover:underline">
                View All
              </Link>
            </div>
            
            <div className="space-y-2">
              {stats.recentEvaluations.map((evalItem) => (
                <div key={evalItem.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium">{evalItem.taskTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(evalItem.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {evalItem.score !== null && (
                    <span className={`text-lg font-bold ${
                      evalItem.score >= 80 ? 'text-green-500' : evalItem.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {evalItem.score}/100
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}