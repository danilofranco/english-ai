import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getMonthMissions,
  isMissionCompleteForUser,
  hasEvaluatedAttempt,
} from '@/lib/curriculum/mission-progress'

const MONTH_KEY = 'month-01-professional-foundation'

const READINESS_SKILLS = [
  { key: 'professional_intro', week: 1, label: 'Professional introduction' },
  { key: 'role_explanation', week: 2, label: 'Role explanation' },
  { key: 'project_story', week: 3, label: 'Project storytelling' },
  { key: 'career_goals', week: 4, label: 'Career goals' },
] as const

export async function GET() {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = session.user.id
    const missions = await getMonthMissions(MONTH_KEY)

    if (missions.length === 0) {
      return NextResponse.json({
        monthKey: MONTH_KEY,
        baseline: true,
        message:
          'Run npm run db:seed:month01 (or full db:seed) to import Month 1 missions.',
        missions: [],
        readiness: READINESS_SKILLS.map((s) => ({
          ...s,
          status: 'not_imported' as const,
        })),
      })
    }

    const missionRows = await Promise.all(
      missions.map(async (m) => {
        const complete = await isMissionCompleteForUser(
          uid,
          m.practiceTaskId,
          m.passOverallThreshold
        )
        const attempted = await hasEvaluatedAttempt(uid, m.practiceTaskId)
        const best = await prisma.evaluation.findFirst({
          where: { userId: uid, attempt: { practiceTaskId: m.practiceTaskId } },
          orderBy: { overallScore: 'desc' },
          select: { overallScore: true },
        })
        return {
          missionKey: m.missionKey,
          weekNumber: m.weekNumber,
          weekTitle: m.weekTitle,
          practiceTaskId: m.practiceTaskId,
          complete,
          attempted,
          bestScore: best?.overallScore ?? null,
          passThreshold: m.passOverallThreshold,
          prompt: m.prompt,
        }
      })
    )

    let completedWeeks = 0
    for (let w = 1; w <= 4; w++) {
      const wm = missionRows.filter((r) => r.weekNumber === w)
      if (wm.length === 0) continue
      if (wm.every((r) => r.complete)) completedWeeks++
    }

    const readiness = READINESS_SKILLS.map((s) => {
      const weekMissions = missionRows.filter((r) => r.weekNumber === s.week)
      const allDone =
        weekMissions.length > 0 && weekMissions.every((r) => r.complete)
      const anyAttempt =
        weekMissions.length > 0 && weekMissions.some((r) => r.attempted)
      return {
        key: s.key,
        week: s.week,
        label: s.label,
        status: allDone ? ('ready' as const) : anyAttempt ? ('in_progress' as const) : ('baseline' as const),
      }
    })

    const bottleneck = [...missionRows]
      .reverse()
      .find((r) => !r.complete && r.attempted)

    return NextResponse.json({
      monthKey: MONTH_KEY,
      baseline: missionRows.every((r) => !r.attempted),
      missions: missionRows,
      readiness,
      completedWeeksCount: completedWeeks,
      bottleneckMissionKey: bottleneck?.missionKey ?? null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load month progress' }, { status: 500 })
  }
}
