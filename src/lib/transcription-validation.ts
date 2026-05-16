/**
 * Shared client/server checks — must stay free of Node-only imports.
 */

export const MOCK_TRANSCRIPTION_TEXT =
  'Mock transcription: describe your answer in more detail when you retry. Replace with Whisper or similar.'

export function looksLikePlaceholderTranscript(text: string | null | undefined): boolean {
  if (text == null) return true
  const t = text.trim()
  if (t.length < 12) return true
  if (t === MOCK_TRANSCRIPTION_TEXT) return true
  return t.includes('Replace with Whisper or similar')
}
