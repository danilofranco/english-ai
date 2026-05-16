import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import {
  getMonthMissions,
  getRecommendedMission,
  hasEvaluatedAttempt,
} from '@/lib/curriculum/mission-progress'

const DEFAULT_MONTH_KEY = 'month-01-professional-foundation'

export async function GET(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthKey = searchParams.get('month') || DEFAULT_MONTH_KEY

    const rec = await getRecommendedMission(session.user.id, monthKey)
    const all = await getMonthMissions(monthKey)

    let showModelAnswer = false
    if (rec.mission) {
      showModelAnswer = await hasEvaluatedAttempt(
        session.user.id,
        rec.mission.practiceTaskId
      )
    }

    return NextResponse.json({
      monthKey,
      monthTitle: monthKey.includes('month-01')
        ? 'Professional Foundation — Month 1'
        : monthKey,
      ...rec,
      showModelAnswerForRecommended: showModelAnswer,
      allMissionKeys: all.map((m) => ({
        missionKey: m.missionKey,
        weekNumber: m.weekNumber,
        practiceTaskId: m.practiceTaskId,
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load curriculum context' }, { status: 500 })
  }
}
