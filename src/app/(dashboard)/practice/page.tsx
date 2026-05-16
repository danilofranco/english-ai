'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  BookOpen, Briefcase, MessageCircle, FileText, 
  ChevronRight, Search, Clock, TrendingUp
} from 'lucide-react'

interface PracticeTask {
  id: string
  title: string
  description: string
  cefrLevel: { code: string }
  skillType: string
  category: string
  estimatedDurationSec: number
  orderIndex: number
  curriculumMission?: {
    missionKey: string
    weekNumber: number
    weekTitle: string
    scenario: string
    prompt: string
    timeTargetSec: number
    passOverallThreshold: number
  } | null
}

const categoryLabels: Record<string, string> = {
  career: 'Career',
  product_tech: 'Product/Tech',
  general_fluency: 'General',
  content_reflection: 'Content',
}

const categoryIcons: Record<string, typeof BookOpen> = {
  career: Briefcase,
  product_tech: BookOpen,
  general_fluency: MessageCircle,
  content_reflection: FileText,
}

export default function PracticeLibraryPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<PracticeTask[]>([])
  const [month01Tasks, setMonth01Tasks] = useState<PracticeTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchTasks() {
      if (!session?.user?.id) return

      try {
        const mRes = await fetch(
          `/api/tasks?curriculumMonth=${encodeURIComponent('month-01-professional-foundation')}`,
          { credentials: 'include' }
        )
        if (mRes.ok) {
          const md = await mRes.json()
          setMonth01Tasks(Array.isArray(md) ? md : [])
        }

        const q = filter !== 'all' ? `?category=${encodeURIComponent(filter)}&excludeCurriculum=1` : '?excludeCurriculum=1'
        const res = await fetch(`/api/tasks${q}`, { credentials: 'include' })
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [session?.user?.id, filter])

  const filteredTasks = tasks.filter(t => 
    search === '' || t.title.toLowerCase().includes(search.toLowerCase())
  )

  const categories = ['all', 'career', 'product_tech', 'general_fluency', 'content_reflection']

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Practice Library</h1>
          <p className="text-muted-foreground mt-1">Choose a task and start practicing</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span>
            Month 1: {month01Tasks.length} missions · Extra practice: {tasks.length}{' '}
            tasks
          </span>
        </div>
      </div>

      {month01Tasks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-2">Professional Foundation — Month 1</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Sequential missions — progress tracked from your evaluations.
          </p>
          <div className="grid gap-3">
            {month01Tasks.map((task) => {
              const m = task.curriculumMission
              return (
                <Link
                  key={task.id}
                  href={`/practice/${task.id}`}
                  className="card flex flex-col sm:flex-row sm:items-start gap-3 py-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary font-medium">
                      Week {m?.weekNumber ?? '?'} · {m?.weekTitle ?? 'Mission'}
                    </p>
                    <h3 className="font-semibold mt-1">{m?.scenario ?? task.title}</h3>
                    <p className="text-sm text-muted-foreground italic mt-1">
                      &quot;{m?.prompt ?? ''}&quot;
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>{task.cefrLevel.code}</span>
                      <span>~{m?.timeTargetSec ?? task.estimatedDurationSec}s target</span>
                      <span>Pass ≥ {m?.passOverallThreshold ?? 60}/100</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <h2 className="text-lg font-semibold mb-4">More practice</h2>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`btn text-sm ${
                filter === cat ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {cat === 'all' ? 'All' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task) => {
          const Icon = categoryIcons[task.category] || BookOpen
          return (
            <Link
              key={task.id}
              href={`/practice/${task.id}`}
              className="card flex items-center gap-4 py-4 hover:border-primary/40 transition-colors group"
            >
              <div className="p-3 rounded-lg bg-muted text-muted-foreground shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{task.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                    {task.cefrLevel.code}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.ceil(task.estimatedDurationSec / 60)} min
                  </span>
                  <span>{categoryLabels[task.category] || task.category}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          )
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found</p>
        </div>
      )}
    </main>
  )
}