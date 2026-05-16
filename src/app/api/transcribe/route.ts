import { NextResponse } from 'next/server'
import { transcribeAudioFile } from '@/lib/ai/transcription'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

async function saveTempAudio(audioBlob: Blob): Promise<string> {
  const buffer = Buffer.from(await audioBlob.arrayBuffer())
  const filename = `temp-${Date.now()}.webm`
  const filepath = join(process.cwd(), 'public', 'recordings', filename)

  await mkdir(join(process.cwd(), 'public', 'recordings'), { recursive: true })
  await writeFile(filepath, buffer)

  return filepath
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob
    const language = (formData.get('language') as string) || 'en-US'

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const audioPath = await saveTempAudio(audioFile)

    try {
      const result = await transcribeAudioFile(audioPath, language)
      return NextResponse.json({
        transcription: result.text,
        durationSec: result.durationSec,
        confidence: result.confidence,
        source: result.source,
      })
    } catch {
      return NextResponse.json(
        {
          error:
            'Transcrição falhou (Whisper). Verifica OPENAI_API_KEY, quotas e que o ficheiro de áudio é válido.',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
}
