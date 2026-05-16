import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const path = await db.learningPath.findUnique({
      where: { id },
      include: {
        level: true,
        steps: { orderBy: { order: 'asc' } },
      },
    })

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    return NextResponse.json({ path })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load path' }, { status: 500 })
  }
}
