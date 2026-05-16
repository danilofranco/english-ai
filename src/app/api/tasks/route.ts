import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const cefrLevelId = searchParams.get('cefrLevelId')
    const skillType = searchParams.get('skillType')
    const scenarioType = searchParams.get('scenarioType')
    const curriculumMonth = searchParams.get('curriculumMonth')
    const excludeCurriculum =
      searchParams.get('excludeCurriculum') === '1' ||
      searchParams.get('excludeCurriculum') === 'true'

    const where: Prisma.PracticeTaskWhereInput = {}
    if (category) where.category = category
    if (cefrLevelId) where.cefrLevelId = cefrLevelId
    if (skillType) where.skillType = skillType
    if (scenarioType) where.scenarioType = scenarioType
    if (curriculumMonth) {
      where.curriculumMission = {
        is: { curriculumMonth: { monthKey: curriculumMonth } },
      }
    } else if (excludeCurriculum) {
      where.curriculumMission = { is: null }
    }

    const tasks = await db.practiceTask.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
      include: {
        cefrLevel: { select: { code: true, title: true, id: true } },
        curriculumMission: {
          select: {
            missionKey: true,
            weekNumber: true,
            weekTitle: true,
            scenario: true,
            prompt: true,
            timeTargetSec: true,
            passOverallThreshold: true,
          },
        },
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
