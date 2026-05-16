import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const levels = await db.level.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            practiceTasks: {
              where: {
                isActive: true,
                curriculumMission: { is: null },
              },
            },
            learningPaths: true,
            learningContents: true,
          },
        },
      },
    })
    return NextResponse.json({ levels })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load levels' }, { status: 500 })
  }
}
