import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = session.user.id

    const snapshot = await prisma.userProgressSnapshot.findUnique({
      where: { userId: uid },
    })

    const evaluations = await prisma.evaluation.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        attempt: {
          include: {
            practiceTask: { include: { cefrLevel: { select: { code: true } } } },
          },
        },
      },
    })

    const byTask = new Map<
      string,
      { title: string; scores: number[]; level: string }
    >()
    for (const e of evaluations) {
      const t = e.attempt.practiceTask
      const cur = byTask.get(t.id) || {
        title: t.title,
        scores: [],
        level: t.cefrLevel.code,
      }
      cur.scores.push(e.overallScore)
      byTask.set(t.id, cur)
    }

    const taskTrend = [...byTask.entries()].map(([id, v]) => ({
      taskId: id,
      title: v.title,
      level: v.level,
      attempts: v.scores.length,
      avgScore:
        v.scores.length > 0
          ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
          : 0,
      lastScore: v.scores[0],
    }))

    return NextResponse.json({ snapshot, evaluations, taskTrend })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }
}
