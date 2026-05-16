import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import { isPrismaMissingTableError } from '@/lib/prisma-table'

type Body = {
  action: 'open' | 'complete' | 'skip' | 'reset'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: learningContentId } = await params
    const content = await db.learningContent.findUnique({
      where: { id: learningContentId },
      select: { id: true },
    })
    if (!content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: Body
    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const action = body?.action
    if (!['open', 'complete', 'skip', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const now = new Date()

    if (action === 'open') {
      const row = await db.userContentProgress.findUnique({
        where: {
          userId_learningContentId: { userId, learningContentId },
        },
      })
      const nextStatus =
        !row || row.status === 'not_started' ? 'in_progress' : row.status
      const progress = await db.userContentProgress.upsert({
        where: {
          userId_learningContentId: { userId, learningContentId },
        },
        create: {
          userId,
          learningContentId,
          status: 'in_progress',
          lastOpenedAt: now,
        },
        update: {
          status: nextStatus,
          lastOpenedAt: now,
        },
      })
      return NextResponse.json({ progress })
    }

    if (action === 'complete') {
      const progress = await db.userContentProgress.upsert({
        where: {
          userId_learningContentId: { userId, learningContentId },
        },
        create: {
          userId,
          learningContentId,
          status: 'completed',
          completedAt: now,
          lastOpenedAt: now,
        },
        update: {
          status: 'completed',
          completedAt: now,
          lastOpenedAt: now,
        },
      })
      return NextResponse.json({ progress })
    }

    if (action === 'skip') {
      const progress = await db.userContentProgress.upsert({
        where: {
          userId_learningContentId: { userId, learningContentId },
        },
        create: {
          userId,
          learningContentId,
          status: 'skipped',
          lastOpenedAt: now,
        },
        update: {
          status: 'skipped',
          lastOpenedAt: now,
        },
      })
      return NextResponse.json({ progress })
    }

    // reset
    const progress = await db.userContentProgress.upsert({
      where: {
        userId_learningContentId: { userId, learningContentId },
      },
      create: {
        userId,
        learningContentId,
        status: 'not_started',
      },
      update: {
        status: 'not_started',
        completedAt: null,
        lastOpenedAt: null,
      },
    })
    return NextResponse.json({ progress })
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            'Schema em falta na base. Corre: npx prisma migrate deploy && npx prisma generate',
        },
        { status: 503 }
      )
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
