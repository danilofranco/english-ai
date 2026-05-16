import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = (await getServerSession()) as {
      user?: { id: string; streak?: number }
    } | null

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const empty = {
      totalPractices: 0,
      thisWeekPractices: 0,
      averageScore: 0,
      currentStreak: 0,
      totalTasksCompleted: 0,
      estimatedOverallLevel: null as string | null,
      pendingReviews: 0,
      apaRecommendation: null as null | {
        phase: string
        reason: string
        microGoal: string
      },
      recentEvaluations: [] as {
        id: string
        taskTitle: string
        score: number | null
        createdAt: string
      }[],
      weakHints: [] as { reason: string; title: string; id: string }[],
    }

    if (!session?.user?.id) {
      return NextResponse.json(empty)
    }

    const uid = session.user.id

    const evaluatedAttempts = await prisma.attempt.findMany({
      where: { userId: uid, status: 'evaluated' },
      orderBy: { createdAt: 'desc' },
      include: {
        practiceTask: true,
        evaluation: true,
      },
    })

    const weekAttempts = evaluatedAttempts.filter(
      (a) => new Date(a.createdAt) >= weekStart
    )

    const evaluations = evaluatedAttempts
      .map((a) => a.evaluation)
      .filter(Boolean) as NonNullable<(typeof evaluatedAttempts)[0]['evaluation']>[]

    const avgScore =
      evaluations.length > 0
        ? Math.round(
            evaluations.reduce((s, e) => s + e.overallScore, 0) /
              evaluations.length
          )
        : 0

    const snapshot = await prisma.userProgressSnapshot.findUnique({
      where: { userId: uid },
    })

    const pendingReviews = await prisma.reviewItem.count({
      where: { userId: uid, status: 'pending' },
    })

    const lastEval = evaluations[0]
    let weakHints: { reason: string; title: string; id: string }[] = []
    if (lastEval) {
      const g = lastEval.grammarScore
      const v = lastEval.vocabularyScore
      const c = lastEval.clarityScore
      const type =
        g <= v && g <= c ? 'grammar' : v <= g && v <= c ? 'vocabulary' : 'clarity'
      const contents = await prisma.learningContent.findMany({
        take: 3,
        orderBy: { updatedAt: 'desc' },
      })
      weakHints = contents.map((lc) => ({
        id: lc.id,
        title: lc.title,
        reason: `Reinforce ${type} — matched to your library`,
      }))
    }

    return NextResponse.json({
      totalPractices: evaluatedAttempts.length,
      thisWeekPractices: weekAttempts.length,
      averageScore: avgScore,
      currentStreak: session.user.streak ?? 0,
      totalTasksCompleted: new Set(evaluatedAttempts.map((a) => a.practiceTaskId))
        .size,
      estimatedOverallLevel: snapshot?.estimatedOverallLevel ?? null,
      pendingReviews,
      apaRecommendation: lastEval
        ? {
            phase: lastEval.apaPhase,
            reason: lastEval.apaReason,
            microGoal: lastEval.apaMicroGoal,
          }
        : null,
      recentEvaluations: evaluatedAttempts.slice(0, 5).map((a) => ({
        id: a.id,
        taskTitle: a.practiceTask.title,
        score: a.evaluation?.overallScore ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      weakHints,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
