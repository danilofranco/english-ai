import { readFile } from 'fs/promises'
import { createReadStream } from 'fs'
import OpenAI from 'openai'
import { MOCK_TRANSCRIPTION_TEXT } from '@/lib/transcription-validation'

export type TranscriptionSource = 'openai-whisper' | 'mock'

export interface TranscriptionResult {
  text: string
  confidence: number
  durationSec: number
  source: TranscriptionSource
}

function whisperLanguageHint(locale?: string): string | undefined {
  if (!locale) return undefined
  const short = locale.split('-')[0]?.toLowerCase()
  if (!short || short.length !== 2) return undefined
  return short
}

/**
 * Server-side transcription. Uses OpenAI Whisper when OPENAI_API_KEY is set.
 * Without a key: returns deterministic mock copy (blocked from evaluation unless user replaces it manually).
 */
export async function transcribeAudioFile(
  absolutePath: string,
  language?: string
): Promise<TranscriptionResult> {
  const key = process.env.OPENAI_API_KEY

  if (key?.trim()) {
    const openai = new OpenAI({ apiKey: key })
    try {
      const lang = whisperLanguageHint(language)
      const fileStream = createReadStream(absolutePath)
      const tr = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        ...(lang ? { language: lang } : {}),
      })

      const text = tr.text.trim()
      if (!text) {
        throw new Error('Empty transcription from Whisper')
      }
      return {
        text,
        confidence: 1,
        durationSec: 0,
        source: 'openai-whisper',
      }
    } catch (e) {
      console.error('[transcription] whisper failed:', e)
      throw e
    }
  }

  void language
  await readFile(absolutePath).catch(() => null)
  return {
    text: MOCK_TRANSCRIPTION_TEXT,
    confidence: 0.85,
    durationSec: 30,
    source: 'mock',
  }
}
