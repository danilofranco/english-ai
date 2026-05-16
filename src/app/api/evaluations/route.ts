import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId required' }, { status: 400 })
    }

    const evaluation = await db.evaluation.findUnique({
      where: { attemptId },
      include: { attempt: { select: { userId: true, transcriptText: true } } },
    })

    if (!evaluation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (evaluation.attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { attempt, ...rest } = evaluation
    void attempt
    return NextResponse.json({
      ...rest,
      transcriptText: evaluation.attempt.transcriptText,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load evaluation' }, { status: 500 })
  }
}
