import { createReadStream } from 'node:fs'
import OpenAI, { toFile } from 'openai'
import { MOCK_TRANSCRIPTION_TEXT } from '@/lib/transcription-validation'

export type TranscriptionSource = 'openai-whisper' | 'mock'

export interface TranscriptionResult {
  text: string
  confidence: number
  durationSec: number
  source: TranscriptionSource
}

async function transcribe(
  upload: () => ReturnType<typeof toFile> | ReturnType<typeof createReadStream>,
  locale?: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return { text: MOCK_TRANSCRIPTION_TEXT, confidence: 0.85, durationSec: 30, source: 'mock' }
  }

  const language = /^([a-z]{2})(?:-[a-z]{2})?$/i.exec(locale ?? '')?.[1].toLowerCase()
  const client = new OpenAI({ apiKey })
  const result = await client.audio.transcriptions.create({
    file: await upload(),
    model: 'whisper-1',
    ...(language ? { language } : {}),
  })
  const text = result.text.trim()
  if (!text) throw new Error('Empty transcription from Whisper')
  return { text, confidence: 1, durationSec: 0, source: 'openai-whisper' }
}

export function transcribeRecording(audio: Blob, filename: string, locale?: string) {
  return transcribe(() => toFile(audio, filename), locale)
}

export function transcribeAudioFile(absolutePath: string, locale?: string) {
  return transcribe(() => createReadStream(absolutePath), locale)
}
