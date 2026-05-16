'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'

interface ReviewRow {
  id: string
  dueAt: string
  reason: string
  status: string
  drillId: string | null
  drillType: string | null
  drillTitle: string | null
  drillInstructions: string | null
  practiceTask: { id: string; title: string } | null
}

function formatReviewReason(reason: string): string {
  if (reason.startsWith('drill:')) {
    const segs = reason.split(':')
    const type = segs[1] ?? 'practice'
    return `Curriculum drill · ${type.replace(/_/g, ' ')}`
  }

  const apaMatch = reason.match(/^apa:(acquire|practice|adjust):(.+)$/)

  if (!apaMatch) return reason

  const phaseLabels: Record<string, string> = {
    acquire: 'Adquirir',
    practice: 'Praticar',
    adjust: 'Ajustar',
  }
  const focus = apaMatch[2]
    .replace(/^retry_focus:/, 'focus: ')
    .replace(/_/g, ' ')
    .replace(/,/g, ', ')

  return `APA ${phaseLabels[apaMatch[1]]}: ${focus}`
}

export default function ReviewsPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    async function fetchReviews() {
      if (!session?.user?.id) return

      try {
        const params = new URLSearchParams()
        params.set('limit', '20')
        params.set('offset', String(page * 20))

        const res = await fetch(`/api/reviews?${params}`, { credentials: 'include' })
        const data = await res.json()
        setReviews(data.reviews || [])
        setTotal(data.total || 0)
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [session?.user?.id, page])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Review queue</h1>
      <p className="text-muted-foreground mb-8">
        Retries and follow-ups from weak scores ({total} items)
      </p>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {r.practiceTask?.title ?? 'Practice task'}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatReviewReason(r.reason)}
              </p>
              {r.drillTitle && (
                <>
                  <p className="text-sm font-semibold mt-2 text-foreground">{r.drillTitle}</p>
                  {r.drillInstructions && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {r.drillInstructions}
                    </p>
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Due {new Date(r.dueAt).toLocaleString()}
              </p>
            </div>
            {r.practiceTask && (
              <Link href={`/practice/${r.practiceTask.id}`} className="btn btn-primary shrink-0">
                Retry
              </Link>
            )}
          </div>
        ))}
      </div>

      {reviews.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Nothing queued — keep practising; low scores enqueue a follow-up automatically.
        </p>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            type="button"
            className="btn btn-outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={(page + 1) * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
