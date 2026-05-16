'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'

interface AttemptRow {
  id: string
  status: string
  createdAt: string
  transcriptText: string | null
  practiceTask: { id: string; title: string } | null
  evaluation: { overallScore: number } | null
}

export default function HistoryPage() {
  const { data: session } = useSession()
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    async function fetchAttempts() {
      if (!session?.user?.id) return
      
      try {
        const params = new URLSearchParams()
        params.set('limit', '20')
        params.set('offset', String(page * 20))

        const res = await fetch(`/api/attempts?${params}`, { credentials: 'include' })
        const data = await res.json()
        setAttempts(data.attempts || [])
        setTotal(data.total || 0)
      } catch (error) {
        console.error('Failed to fetch attempts:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAttempts()
  }, [session?.user?.id, page])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Practice History</h1>
            <p className="text-gray-400 mt-1">{total} total attempts</p>
          </div>
        </div>

        <div className="space-y-3">
          {attempts.map((attempt) => {
            const taskId = attempt.practiceTask?.id
            const hasReview = Boolean(attempt.evaluation && taskId)

            const Row = (
              <div className="flex items-center gap-4 w-full min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    attempt.status === 'evaluated'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">
                    {attempt.practiceTask?.title ?? `Attempt ${attempt.id.slice(-6)}`}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
                    <span>{attempt.status}</span>
                    <span>•</span>
                    <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                    {hasReview ? (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400/90">ver avaliação</span>
                      </>
                    ) : null}
                  </div>
                  {attempt.transcriptText && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {attempt.transcriptText.slice(0, 80)}...
                    </p>
                  )}
                </div>
                {attempt.evaluation && (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-green-400">
                      {attempt.evaluation.overallScore}
                    </span>
                    <span className="text-sm text-gray-500">/100</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
              </div>
            )

            const shellClass =
              'flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg transition-colors hover:border-gray-600'

            if (hasReview && taskId) {
              return (
                <Link
                  key={attempt.id}
                  href={`/practice/${taskId}/review/${attempt.id}`}
                  className={shellClass}
                >
                  {Row}
                </Link>
              )
            }

            if (taskId) {
              return (
                <Link key={attempt.id} href={`/practice/${taskId}`} className={shellClass}>
                  {Row}
                </Link>
              )
            }

            return (
              <div key={attempt.id} className={shellClass}>
                {Row}
              </div>
            )
          })}
        </div>

        {attempts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No attempts yet</p>
            <Link href="/practice" className="mt-4 inline-block text-blue-500 hover:underline">
              Start practicing
            </Link>
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page + 1} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * 20 >= total}
              className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}