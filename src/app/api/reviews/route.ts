import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'

/** Pending review queue (ReviewItem), not LLM evaluation rows */
export async function GET(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: session.user.id }
    if (attemptId) {
      const ownsAttempt = await db.attempt.findFirst({
        where: { id: attemptId, userId: session.user.id },
        select: { id: true },
      })
      if (!ownsAttempt) {
        return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 })
      }
      where.attemptId = attemptId
    }

    const reviews = await db.reviewItem.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: limit,
      skip: offset,
      include: {
        practiceTask: { select: { id: true, title: true } },
        attempt: { select: { id: true } },
      },
    })

    const total = await db.reviewItem.count({ where })

    return NextResponse.json({ reviews, total })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
