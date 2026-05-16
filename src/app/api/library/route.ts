import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { sortLibraryItemsNatural } from '@/lib/path-sort'
import { getServerSession } from '@/lib/auth'
import { isPrismaMissingTableError } from '@/lib/prisma-table'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cefrLevelId = searchParams.get('cefrLevelId')
    const type = searchParams.get('type')
    const skillType = searchParams.get('skillType')
    const topic = searchParams.get('topic')
    const source = searchParams.get('source')
    /** pasta exacta (inclui raiz vazia se folder=) */
    const hasFolder = searchParams.has('folder')
    const folder = searchParams.get('folder')
    /** curso (primeiro segmento): folderPath === course OU começa com course/ */
    const course = searchParams.get('course')

    const where: Prisma.LearningContentWhereInput = {}
    if (cefrLevelId) where.cefrLevelId = cefrLevelId
    if (type) where.type = type
    if (skillType) where.skillType = skillType
    if (topic) where.topic = { contains: topic }
    if (source) where.source = source

    if (hasFolder) {
      where.folderPath = folder ?? ''
    } else if (course) {
      where.OR = [
        { folderPath: course },
        { folderPath: { startsWith: `${course}/` } },
      ]
    }

    const raw = await db.learningContent.findMany({
      where,
      orderBy: [{ folderPath: 'asc' }, { localPath: 'asc' }],
      include: { cefrLevel: { select: { code: true, title: true } } },
    })

    const sorted = sortLibraryItemsNatural(raw)

    const session = (await getServerSession()) as { user?: { id: string } } | null
    const userId = session?.user?.id

    const progressByContentId: Record<
      string,
      { status: string; lastOpenedAt: Date | null; completedAt: Date | null }
    > = {}

    if (userId && sorted.length > 0) {
      const ids = sorted.map((r) => r.id)
      try {
        const rows = await db.userContentProgress.findMany({
          where: { userId, learningContentId: { in: ids } },
          select: {
            learningContentId: true,
            status: true,
            lastOpenedAt: true,
            completedAt: true,
          },
        })
        for (const r of rows) {
          progressByContentId[r.learningContentId] = {
            status: r.status,
            lastOpenedAt: r.lastOpenedAt,
            completedAt: r.completedAt,
          }
        }
      } catch (e) {
        if (!isPrismaMissingTableError(e)) throw e
      }
    }

    const items = sorted.map((it) => {
      const p = progressByContentId[it.id]
      return {
        ...it,
        progress: p
          ? {
              status: p.status,
              lastOpenedAt: p.lastOpenedAt?.toISOString() ?? null,
              completedAt: p.completedAt?.toISOString() ?? null,
            }
          : null,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load library' }, { status: 500 })
  }
}
