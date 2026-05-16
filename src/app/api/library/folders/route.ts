import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Pastas sob `content/` (campo folderPath) + cursos = primeiro segmento do path.
 */
export async function GET() {
  try {
    const grouped = await db.learningContent.groupBy({
      by: ['folderPath'],
      _count: { id: true },
    })

    const paths = grouped
      .map((g) => ({
        path: g.folderPath,
        count: g._count.id,
      }))
      .sort((a, b) => a.path.localeCompare(b.path))

    const courseSet = new Set<string>()
    for (const { path: p } of paths) {
      if (!p) continue
      courseSet.add(p.split('/')[0])
    }

    const courses = [...courseSet].sort()

    return NextResponse.json({ courses, paths })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 })
  }
}
