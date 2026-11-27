import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import * as recordingUpload from '../src/lib/recording-upload.ts'

const { isTranscriptionAudio, transcriptionFilename } = recordingUpload.default ?? recordingUpload

test('accepts a populated browser recording but not a missing or empty recording', () => {
  const form = new FormData()
  assert.equal(isTranscriptionAudio(form.get('audio')), false)
  form.set('audio', new Blob([], { type: 'audio/webm' }), 'recording.webm')
  assert.equal(isTranscriptionAudio(form.get('audio')), false)
  form.set('audio', new Blob(['fixture'], { type: 'audio/webm' }), 'recording.webm')
  assert.equal(isTranscriptionAudio(form.get('audio')), true)
})

test('uses a fixed filename for each supported browser format', () => {
  assert.equal(transcriptionFilename(new Blob(['fixture'], { type: 'audio/webm; codecs=opus' })), 'recording.webm')
  assert.equal(transcriptionFilename(new Blob(['fixture'], { type: 'audio/mp4' })), 'recording.mp4')
  assert.equal(transcriptionFilename(new Blob(['fixture'], { type: 'text/plain' })), null)
})
