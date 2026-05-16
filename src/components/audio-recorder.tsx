'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react'
import { looksLikePlaceholderTranscript } from '@/lib/transcription-validation'

export type TranscribeResult = { text: string; source: string }

interface AudioRecorderProps {
  onTranscribe?: (audioBlob: Blob) => Promise<TranscribeResult | null>
  onSubmit?: (audioBlob: Blob, transcription: string, durationSec: number) => Promise<void>
  isTranscribing?: boolean
  isEvaluating?: boolean
}

export default function AudioRecorder({ 
  onTranscribe, 
  onSubmit,
  isTranscribing = false,
  isEvaluating = false 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [transcriptionSource, setTranscriptionSource] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        
        stream.getTracks().forEach(track => track.stop())
        
        if (onTranscribe) {
          onTranscribe(blob).then((result) => {
            if (result) {
              setTranscription(result.text)
              setTranscriptionSource(result.source)
            }
          })
        }
      }

      mediaRecorder.start()
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        timerRef.current = setInterval(() => {
          setDuration(d => d + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
      setIsPaused(!isPaused)
    }
  }

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setDuration(0)
    setTranscription('')
    setTranscriptionSource(null)
  }

  const handleSubmit = async () => {
    if (!audioBlob || !onSubmit) return
    
    setSubmitting(true)
    try {
      await onSubmit(audioBlob, transcription, duration)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const transcriptBlocked = looksLikePlaceholderTranscript(transcription)
  const isProcessing = isTranscribing || isEvaluating || submitting

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        {!audioUrl ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
            }`}
          >
            {isRecording ? (
              <Square className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>
        ) : null}

        {isRecording && (
          <button
            onClick={togglePause}
            className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-white" />
            ) : (
              <Pause className="w-5 h-5 text-white" />
            )}
          </button>
        )}
      </div>

      <div className="text-center">
        <span className={`text-2xl font-mono ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
          {formatTime(duration)}
        </span>
        {isRecording && (
          <p className="text-sm text-red-500 mt-2">Recording...</p>
        )}
      </div>

      {audioUrl && (
        <div className="flex items-center justify-center gap-4">
          <audio 
            src={audioUrl} 
            controls 
            className="w-full max-w-md"
          />
          <button
            onClick={deleteRecording}
            className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {audioUrl && transcriptionSource === 'mock' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-100">
          <p className="font-medium">Transcrição automática não disponível</p>
          <p className="mt-1 text-amber-100/85">
            O servidor está em modo mock (sem Whisper). O texto pré-preenchido{' '}
            <strong>não</strong> vem do teu áudio — define{' '}
            <code className="text-xs bg-black/40 px-1 rounded">OPENAI_API_KEY</code> no{' '}
            <code className="text-xs bg-black/40 px-1 rounded">.env.local</code> e reinicia, ou{' '}
            substitui o texto caixa por baixo pela transcrição real antes de Submit.
          </p>
        </div>
      )}

      {audioUrl && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-400">Transcrição (precisa reflectir o que disseste)</p>
          {isTranscribing && transcription === '' ? (
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              A transcrever áudio…
            </p>
          ) : (
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              disabled={isTranscribing || isEvaluating || submitting}
              rows={8}
              className="w-full rounded-md border border-gray-700 bg-gray-950/80 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
              placeholder="Aparece aqui texto do Whisper ou cola/edita tu a transcrição."
            />
          )}
          {transcriptBlocked && transcription.trim().length > 0 ? (
            <p className="text-xs text-amber-400">
              Não podes avaliar este texto-placeholder. Configura Whisper ou edita até ser a tua fala real.
            </p>
          ) : null}
        </div>
      )}

      {audioUrl && onSubmit && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !transcription.trim() || transcriptBlocked}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-medium"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isEvaluating ? 'Evaluating...' : 'Submit'}
          </button>
        </div>
      )}

      {!isRecording && !audioUrl && (
        <p className="text-center text-gray-500 text-sm">
          Press the microphone button to start recording
        </p>
      )}
    </div>
  )
}