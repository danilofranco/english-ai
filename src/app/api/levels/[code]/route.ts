import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import { isDoneStatus, isLibraryPlaceholderLocalPath } from '@/lib/content-progress'
import { isPrismaMissingTableError } from '@/lib/prisma-table'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const upper = code.toUpperCase()

    const level = await db.level.findUnique({
      where: { code: upper },
      include: {
        practiceTasks: {
          where: {
            isActive: true,
            curriculumMission: { is: null },
          },
          orderBy: { orderIndex: 'asc' },
        },
        learningPaths: {
          include: {
            steps: { orderBy: { order: 'asc' } },
          },
        },
        learningContents: {
          orderBy: [{ folderPath: 'asc' }, { localPath: 'asc' }],
          take: 500,
        },
      },
    })

    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
    }

    const session = (await getServerSession()) as { user?: { id: string } } | null
    const userId = session?.user?.id

    const contents = level.learningContents.filter(
      (c) => !isLibraryPlaceholderLocalPath(c.localPath)
    )

    let contentProgressById: Record<
      string,
      { status: string; completedAt: string | null; lastOpenedAt: string | null }
    > = {}
    let nextContentId: string | null = null

    if (userId && contents.length > 0) {
      try {
        const ids = contents.map((c) => c.id)
        const rows = await db.userContentProgress.findMany({
          where: { userId, learningContentId: { in: ids } },
        })
        contentProgressById = Object.fromEntries(
          rows.map((p) => [
            p.learningContentId,
            {
              status: p.status,
              completedAt: p.completedAt?.toISOString() ?? null,
              lastOpenedAt: p.lastOpenedAt?.toISOString() ?? null,
            },
          ])
        )
        const next = contents.find((c) => {
          const st = contentProgressById[c.id]?.status
          return !isDoneStatus(st)
        })
        nextContentId = next?.id ?? null
      } catch (e) {
        if (isPrismaMissingTableError(e)) {
          console.warn(
            '[levels] UserContentProgress missing — run: npx prisma migrate deploy'
          )
          nextContentId = contents[0].id
        } else {
          throw e
        }
      }
    } else if (contents.length > 0) {
      nextContentId = contents[0].id
    }

    return NextResponse.json({
      level: { ...level, learningContents: contents },
      contentProgressById,
      nextContentId,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load level' }, { status: 500 })
  }
}
