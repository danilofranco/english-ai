export const MAX_TRANSCRIPTION_BYTES = 25_000_000
export const MAX_TRANSCRIPTION_REQUEST_BYTES = MAX_TRANSCRIPTION_BYTES + 1_000_000

const audioExtensions: Readonly<Record<string, string>> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/mp4': 'mp4',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
}

export function isTranscriptionAudio(value: FormDataEntryValue | null): value is File {
  return value instanceof Blob && value.size > 0
}

export function transcriptionFilename(audio: Blob): string | null {
  const mediaType = audio.type.split(';')[0].trim().toLowerCase()
  const extension = Object.hasOwn(audioExtensions, mediaType) ? audioExtensions[mediaType] : null
  return extension ? 'recording.' + extension : null
}
