/**
 * Client helpers (Web Speech API) + re-export server transcription for API routes.
 */
export { transcribeAudioFile } from './ai/transcription'
export type { TranscriptionResult, TranscriptionSource } from './ai/transcription'

export interface BrowserTranscriptionResult {
  text: string
  confidence: number
  duration: number
}

interface SpeechRecognitionLike {
  start: () => void
  stop: () => void
  abort?: () => void
  continuous?: boolean
  interimResults?: boolean
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  return new Ctor()
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/** @deprecated use transcribeAudioFile via /api/transcribe */
export async function transcribeAudio(
  audioPath: string,
  language = 'en-US'
): Promise<string> {
  const { transcribeAudioFile } = await import('./ai/transcription')
  const r = await transcribeAudioFile(audioPath, language)
  return r.text
}
