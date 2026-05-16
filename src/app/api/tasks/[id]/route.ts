import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    const { id } = await params

    const task = await db.practiceTask.findUnique({
      where: { id },
      include: {
        cefrLevel: true,
        contents: {
          include: { learningContent: true },
        },
        curriculumMission: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const attempts =
      session?.user?.id != null
        ? await db.attempt.findMany({
            where: { practiceTaskId: id, userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: { evaluation: true },
          })
        : []

    return NextResponse.json({ task, attempts })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}
