import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import { looksLikePlaceholderTranscript } from '@/lib/transcription-validation'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

async function saveAudioFile(
  audioBlob: Blob,
  userId: string,
  taskId: string
): Promise<string> {
  const buffer = Buffer.from(await audioBlob.arrayBuffer())
  const filename = `${userId}-${taskId}-${Date.now()}.webm`
  const filepath = join(process.cwd(), 'public', 'recordings', filename)

  await mkdir(join(process.cwd(), 'public', 'recordings'), { recursive: true })
  await writeFile(filepath, buffer)

  return `/recordings/${filename}`
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const taskId = formData.get('taskId') as string
    const userId = session.user.id
    const audioFile = formData.get('audio') as Blob
    const transcription = formData.get('transcription') as string
    const durationSecRaw = formData.get('durationSec') as string | null
    const durationSec = durationSecRaw ? parseInt(durationSecRaw, 10) : null

    if (!userId || !taskId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (looksLikePlaceholderTranscript(transcription)) {
      return NextResponse.json(
        {
          error:
            'Transcrição inválida ou ainda por preencher. Configura OPENAI_API_KEY para Whisper ou corrige/edita o texto da transcrição antes de enviar.',
        },
        { status: 400 }
      )
    }

    let audioPath: string | null = null
    if (audioFile && audioFile.size > 0) {
      audioPath = await saveAudioFile(audioFile, userId, taskId)
    }

    const attempt = await db.attempt.create({
      data: {
        userId,
        practiceTaskId: taskId,
        audioPath,
        transcriptText: transcription || null,
        durationSec: Number.isFinite(durationSec as number) ? durationSec : null,
        status: 'pending_evaluation',
      },
    })

    return NextResponse.json(attempt)
  } catch (error) {
    console.error('Error creating attempt:', error)
    return NextResponse.json({ error: 'Failed to create attempt' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = (await getServerSession()) as { user?: { id: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = session.user.id
    const taskId = searchParams.get('taskId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId }
    if (taskId) where.practiceTaskId = taskId

    const attempts = await db.attempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        evaluation: true,
        practiceTask: { select: { title: true, id: true } },
      },
    })

    const total = await db.attempt.count({ where })

    return NextResponse.json({ attempts, total })
  } catch (error) {
    console.error('Error fetching attempts:', error)
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
  }
}
