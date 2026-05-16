import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import { isPrismaMissingTableError } from '@/lib/prisma-table'
import { sortByLocalPathNatural } from '@/lib/path-sort'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = (await getServerSession()) as { user?: { id: string } } | null
    const userId = session?.user?.id

    const item = await db.learningContent.findUnique({
      where: { id },
      include: { cefrLevel: { select: { code: true, title: true } } },
    })
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let progress = null as null | {
      status: string
      lastOpenedAt: Date | null
      completedAt: Date | null
    }
    if (userId) {
      try {
        const row = await db.userContentProgress.findUnique({
          where: {
            userId_learningContentId: { userId, learningContentId: id },
          },
          select: { status: true, lastOpenedAt: true, completedAt: true },
        })
        progress = row
      } catch (e) {
        if (isPrismaMissingTableError(e)) {
          console.warn(
            '[library] UserContentProgress missing — run: npx prisma migrate deploy'
          )
        } else {
          throw e
        }
      }
    }

    const siblings = await db.learningContent.findMany({
      where: { folderPath: item.folderPath },
      select: { id: true, localPath: true, title: true },
    })
    const ordered = sortByLocalPathNatural(siblings)
    const idx = ordered.findIndex((s) => s.id === id)
    const folderNav =
      ordered.length === 0
        ? null
        : {
            position: idx >= 0 ? idx + 1 : 1,
            total: ordered.length,
            prevId: idx > 0 ? ordered[idx - 1].id : null,
            nextId: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null,
            folderPath: item.folderPath,
          }

    return NextResponse.json({ item, progress, folderNav })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load item' }, { status: 500 })
  }
}
