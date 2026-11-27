import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { transcribeRecording } from '@/lib/ai/transcription'
import { isTranscriptionAudio, MAX_TRANSCRIPTION_BYTES, MAX_TRANSCRIPTION_REQUEST_BYTES, transcriptionFilename } from '@/lib/recording-upload'

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const size = Number(request.headers.get('content-length'))
  if (size > MAX_TRANSCRIPTION_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Audio exceeds the 25 MB limit' }, { status: 413 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  const audio = formData.get('audio')
  if (!isTranscriptionAudio(audio)) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }
  if (audio.size > MAX_TRANSCRIPTION_BYTES) {
    return NextResponse.json({ error: 'Audio exceeds the 25 MB limit' }, { status: 413 })
  }

  const filename = transcriptionFilename(audio)
  if (!filename) {
    return NextResponse.json({ error: 'Unsupported audio format' }, { status: 415 })
  }
  const locale = formData.get('language')
  const language = typeof locale === 'string' ? locale : 'en-US'

  try {
    const { text, durationSec, confidence, source } = await transcribeRecording(audio, filename, language)
    return NextResponse.json({ transcription: text, durationSec, confidence, source })
  } catch {
    return NextResponse.json({ error: 'Não foi possível transcrever o áudio.' }, { status: 502 })
  }
}
